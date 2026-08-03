# Architecture

## Backend

### Module structure

```
backend/src/
  database/      DatabaseService — node:sqlite wrapper, migration on startup
  parser/        ParserService — log line → ParsedEvent, subsystem tagging
  events/        EventsRepository, EventsService, EventsController + DTOs
  ingestion/     IngestionService — seed logic + interval-based live generator
  sse/           SseService — Subject<DiagnosticEvent> multicast to HTTP clients
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

**SQLite via `node:sqlite`** — Node 22+ includes a built-in synchronous SQLite driver with no native compilation required. On this system there are no VS Build Tools, so native add-ons (like `better-sqlite3`) fail to compile. `node:sqlite` has the same synchronous API style, which suits NestJS's request/response model well.

**SSE over WebSocket** — One-directional, standard HTTP, no additional libraries. The backend uses an RxJS `Subject` that multicasts to all connected `EventSource` clients. Each request to `GET /events/stream` subscribes to that subject and receives events as `data:` payloads.

**"Critical" logic** — A single aggregation query with a `HAVING` clause against the event timestamp. No separate state table. The definition is point-in-time: check the last 15-minute window on each request. This avoids needing a background job to flip state flags, and it naturally self-corrects when errors age out.

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
  BehaviorSubject (vehicleIds$, code$, level$, ...)
        │
        ▼ combineLatest + debounceTime
  activeFilters$ (shareReplay(1))
        │
        ├──▶ events$       switchMap → GET /events
        └──▶ vehicleStats$ switchMap → GET /events/stats/by-vehicle

  Separately (not filter-dependent):
  codeSummary$ ─────────────────── GET /events/stats/by-code
  critical$    ─────────────────── GET /events/critical
  liveStream$  ─────────────────── EventSource /events/stream
                        │
                        ▼
               pendingCount$ (BehaviorSubject)
                        │
                        ▼
               LiveBannerComponent shows "N new events — Load now"
```

### RxJS operator choices

- **`combineLatest`** — emits when any filter changes, with the full current state of all filters. Used because we always want the full filter object to construct the query.
- **`switchMap`** — cancels in-flight HTTP request when filters change. Without this, a fast typer would fire N requests and get results back out of order.
- **`debounceTime`** — on text inputs only (vehicle IDs, code). Prevents sending a request on every keystroke. 300ms for vehicle IDs, 400ms for date inputs (which trigger on each digit).
- **`distinctUntilChanged`** — prevents duplicate emissions when a field is set to the same value. Cheap and prevents spurious re-fetches.
- **`shareReplay(1)`** — `activeFilters$` and derived streams are subscribed by multiple components (events table and aggregations both react to filter changes). Without shareReplay, each subscriber would trigger its own combineLatest computation and its own HTTP request. shareReplay(1) makes them share a single upstream and replay the last value to new subscribers.
- **`startWith`** — ensures the loading state is emitted immediately before the async result arrives, so the UI can show a spinner without waiting for the HTTP response.

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
