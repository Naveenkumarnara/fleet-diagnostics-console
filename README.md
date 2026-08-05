# Fleet Health & Diagnostics Console

A fullstack dashboard for monitoring connected vehicles in near-real time. Operations engineers can filter diagnostic events by vehicle, code, severity, and time range; see aggregated stats; and watch live events arrive without losing their current filter state.

## Running with Docker

```bash
docker compose up --build
```

Open http://localhost. The frontend is served by nginx on port 80; it proxies `/api/` requests to the backend container. The SQLite database is persisted in a Docker named volume (`fleet-db`) across restarts.

To pre-populate historical data before starting:
```bash
cd backend && npm run seed
cd .. && docker compose up --build
```

Or just let the live generator run — it inserts an event every 4 seconds automatically once the backend starts.

## Prerequisites (dev mode)

- Node.js 18+ (22+ recommended)
- Windows: Visual Studio Build Tools 2022 with the "Desktop development with C++" workload (required to compile `better-sqlite3`)
- npm 10+
- Angular CLI: `npm install -g @angular/cli`
- NestJS CLI: `npm install -g @nestjs/cli`

## Running in dev mode

**Backend** (port 3000):
```bash
cd backend
npm install
npm run start:dev
```

**Frontend** (port 4200):
```bash
cd frontend
npm install
ng serve
```

Open http://localhost:4200. The backend must be running for data to appear.

## Seed script

To populate historical data (7 days, ~300 events/day):
```bash
cd backend
npm run seed
# or with custom duration:
npx ts-node scripts/seed.ts 14 500   # 14 days, 500 events/day
```

The live generator starts automatically with the backend (default: one event every 4 seconds). Set `LIVE_INTERVAL_MS` to change the rate.

## Running tests

```bash
# backend — parser, repository queries, critical aggregation logic
cd backend && npm test

# frontend — state service reactive chains, search panel wiring
cd frontend && ng test --watch=false
```

32 tests total: 14 backend, 18 frontend.

## API docs (Swagger)

Available at http://localhost:3000/api/docs when the backend is running. No static spec is committed — the live docs are generated from decorators.

## Environment variables (backend)

| Variable | Default | Description |
|---|---|---|
| `PORT` | 3000 | HTTP port |
| `DB_PATH` | `./fleet.db` | SQLite database path |
| `CORS_ORIGIN` | `http://localhost:4200` | Allowed CORS origin |
| `CRITICAL_WINDOW_MINUTES` | 15 | Window for "critical" detection |
| `CRITICAL_ERROR_THRESHOLD` | 3 | Minimum errors to flag as critical |
| `LIVE_INTERVAL_MS` | 4000 | Live event generation interval |
| `THROTTLE_TTL` | 60 | Rate-limit window in seconds |
| `THROTTLE_LIMIT` | 120 | Max requests per IP per window |

## What currently works

- REST API with all filter combinations — `GET /api/events`, `/stats/by-vehicle`, `/stats/by-code`, `/critical`; all aggregation endpoints accept `from`/`to` time range
- `GET /api/health` — db connectivity check and uptime
- Consistent error shape on every bad request: `{ statusCode, message, path, timestamp }`
- Request logging on every HTTP call: method, path, status, duration
- Config validated at startup via Joi — bad env values fail fast with a clear message
- Security hardening: Helmet headers (CSP, HSTS, X-Frame-Options), per-IP rate limiting (120 req/min, SSE stream exempt), generic error responses that don't leak internals
- Graceful shutdown on SIGTERM — drains in-flight requests, clears the live-stream timer, closes the DB
- Server-Sent Events stream at `/api/events/stream`
- Seed script + background live generator (one event every 4s)
- Angular dashboard: reactive filter panel, paginated events table, aggregations (critical vehicles, top codes, per-vehicle breakdown) — all views respect the active time range
- Live update banner: counts incoming SSE events, reloads all views on demand without disrupting current filters
- Error state propagated to the UI — API failures show a message instead of a frozen spinner
- 32 tests: 14 backend (parser, filters, critical logic), 18 frontend (state service reactive chains, search panel wiring)

## What I'd do next

- **Cursor pagination**: offset pagination scans the full result set for each page. Fine for 2K–20K rows but would need cursor-based pagination for larger datasets.
- **Auth**: currently zero auth. A real deployment would need at minimum an API key or JWT on the backend.
- **Error recovery in SSE**: the frontend EventSource reconnects automatically on error, but there's no handling for missed events during a gap. A sequence ID and "fetch missed events since sequence N" pattern would fix this.
- **E2E tests**: no Playwright or Cypress setup yet. Would want at minimum: "filter by vehicle ID → correct events shown" and "live banner appears → click load → table refreshes".
- **PostgreSQL**: SQLite is fine for a single-server demo but doesn't support concurrent writes from multiple backend instances. Real fleet deployments would want Postgres.

## Technical notes

The backend uses `better-sqlite3` for SQLite access — synchronous, prepared statements, and native `db.transaction()` support. It compiles a native addon on install, so Windows requires VS Build Tools 2022 with the C++ workload. Docker builds work out of the box (Alpine has gcc).

Pagination is offset-based. A `// TODO: cursor pagination for large datasets` note is in the repo but not implemented.
