# Architecture

## Backend

### Module structure

```
backend/src/
  config/        app.config.ts — typed config factory, Joi validation schema
  common/        AllExceptionsFilter, LoggingInterceptor
  database/      DatabaseService — better-sqlite3 wrapper, migration on startup
  parser/        ParserService — log line → ParsedEvent, subsystem tagging
  events/        EventsRepository, EventsService, EventsController + DTOs
  ingestion/     IngestionService — seed logic + interval-based live generator
  sse/           SseService — Subject<DiagnosticEvent> multicast to HTTP clients
  health/        HealthController — GET /api/health
```

Each module has a single responsibility. The controller only knows about the service; the service knows about the repo and parser; the repo owns all SQL.

### Data model

```sql
diagnostic_events (
  id          INTEGER PK AUTOINCREMENT,
  timestamp   TEXT NOT NULL,   -- ISO 8601 UTC
  vehicle_id  TEXT NOT NULL,
  level       TEXT CHECK(level IN ('ERROR','WARN','INFO')),
  code        TEXT NOT NULL,   -- OBD-II / custom code
  message     TEXT NOT NULL,
  subsystem   TEXT,            -- derived from code prefix
  mileage     INTEGER,         -- nullable, available for future enrichment
  created_at  TEXT DEFAULT (datetime('now'))
)
```

Indexes on `vehicle_id`, `level`, `code`, `timestamp` — the four dimensions of every filter.

### Key decisions

**SQLite via `better-sqlite3`** — Synchronous, battle-tested, and well-typed. The synchronous API suits NestJS's request/response model well — no async/await noise in the repository layer. `db.transaction()` wraps bulk inserts cleanly. Requires a native compile on install (VS Build Tools on Windows, gcc on Linux/Docker).

**SSE over WebSocket** — One-directional, standard HTTP, no additional libraries. The backend uses an RxJS `Subject` that multicasts to all connected `EventSource` clients. Each request to `GET /events/stream` subscribes to that subject and receives events as `data:` payloads.

**"Critical" logic** — A single aggregation query with a `HAVING` clause against the event timestamp. No separate state table. The definition is point-in-time: check the last 15-minute window on each request. This avoids needing a background job to flip state flags, and it naturally self-corrects when errors age out.

**Config validation** — `@nestjs/config` with a Joi schema in `AppModule`. If a required env var is missing or the wrong type, the app throws at startup rather than silently using a default and failing later at runtime.

**Global exception filter** — `AllExceptionsFilter` catches everything and returns `{ statusCode, message, path, timestamp }`. Only known `HttpException`s forward their message; anything unexpected returns a generic "Internal server error" so DB paths, stack traces, and library internals never reach the client.

**Request logging** — `LoggingInterceptor` logs every HTTP request: method, path, status code, duration. Wired as a global interceptor in `main.ts`.

**Security hardening** — Helmet sets CSP, HSTS, and X-Frame-Options headers. `ThrottlerGuard` rate-limits every route to 120 requests per IP per minute (configurable); the SSE stream is exempt via `@SkipThrottle()` since it's one long-lived connection, not repeated requests.

**Graceful shutdown** — `app.enableShutdownHooks()` means SIGTERM (Docker stop, K8s pod eviction) triggers `OnApplicationShutdown` hooks: the live-stream interval is cleared and the SQLite handle closed before the process exits, instead of dropping in-flight work.

**Validation** — `class-validator` DTOs on query params. The `@Transform` decorator on `vehicleIds` handles the comma-to-array split. Date range is validated as ISO 8601 before it ever reaches the repository.

### Live event generation

`IngestionService.startLiveStream()` sets an interval (default 4s, configurable via `LIVE_INTERVAL_MS`) that generates a random event, inserts it, and emits it on the SSE subject. This runs as a background side-effect on app bootstrap. In a real system this would be replaced by a vehicle telemetry ingestion queue (Kafka / MQTT).

---

## Frontend

### State management approach

RxJS + a single `FleetStateService`. Angular Signals (standalone) and NgRx were considered:
- Signals would require more boilerplate for the async/cancellation patterns needed here (switchMap, debounceTime)
- NgRx is excellent for complex multi-slice state but overkill for 5 filter inputs and 4 async responses

The service pattern keeps all reactive logic in one place and avoids spreading subscription management across components.

### Data flow

```
User changes filter input
        │
        ▼
  BehaviorSubject (vehicleIds$, code$, level$, from$, to$, page$, refreshTrigger$)
        │
        ▼ combineLatest + debounceTime
  activeFilters$ (shareReplay(1))
        │
        ├──▶ events$       switchMap → GET /api/events
        ├──▶ vehicleStats$ switchMap → GET /api/events/stats/by-vehicle
        └──▶ codeSummary$  switchMap → GET /api/events/stats/by-code  ← respects time range

  refreshTrigger$ (incremented by applyLiveUpdates)
        └──▶ critical$     switchMap → GET /api/events/critical

  liveStream$  ──────────────────── EventSource /api/events/stream
                        │
                        ▼
               pendingCount$ (BehaviorSubject)
                        │
                        ▼
               LiveBannerComponent — "N new events — Load now"
               (clicking increments refreshTrigger$, reloads all views)
```

### RxJS operator choices

- **`combineLatest`** — emits when any filter changes, with the full current state of all filters. Used because we always want the full filter object to construct the query.
- **`switchMap`** — cancels in-flight HTTP request when filters change. Without this, a fast typer would fire N requests and get results back out of order.
- **`debounceTime`** — on text inputs only (vehicle IDs, code). Prevents sending a request on every keystroke. 300ms for vehicle IDs, 400ms for date inputs (which trigger on each digit).
- **`distinctUntilChanged`** — prevents duplicate emissions when a field is set to the same value. Cheap and prevents spurious re-fetches.
- **`shareReplay(1)`** — `activeFilters$` and derived streams are subscribed by multiple components (events table and aggregations both react to filter changes). Without shareReplay, each subscriber would trigger its own combineLatest computation and its own HTTP request. shareReplay(1) makes them share a single upstream and replay the last value to new subscribers.
- **`startWith`** — ensures the loading state is emitted immediately before the async result arrives, so the UI can show a spinner without waiting for the HTTP response.
- **`catchError`** — every HTTP observable catches errors and maps them to `{ data: null, loading: false, error: message }`. Without this, a failed request would leave the stream silent and the UI stuck in a loading state forever.
- **`refreshTrigger$`** — a `BehaviorSubject<number>` that gets incremented when the user clicks "Load now". It's included in `combineLatest` so all filter-dependent streams re-fetch, and `critical$` subscribes to it directly. Using an incrementing number (not a boolean toggle) avoids `distinctUntilChanged` suppressing repeated reloads on the same page.

### Component breakdown

```
App (shell)
├── SearchPanelComponent  — reactive form → FleetStateService setters
├── LiveBannerComponent   — shows pending count, emits applyLiveUpdates()
└── router-outlet
    ├── EventsTableComponent    — consumes fleet.events$, handles pagination
    └── AggregationsComponent   — consumes vehicleStats$, codeSummary$, critical$
```

`LoadingErrorComponent` is a small shared wrapper used in both EventsTable and Aggregations to avoid repeating the loading/error template logic.
