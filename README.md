# Fleet Health & Diagnostics Console

A fullstack dashboard for monitoring connected vehicles in near-real time. Operations engineers can filter diagnostic events by vehicle, code, severity, and time range; see aggregated stats; and watch live events arrive without losing their current filter state.

## Running with Docker

```bash
docker compose up --build
```

Open http://localhost. The frontend is served by nginx on port 80; it proxies `/api/` requests to the backend container. The SQLite database is persisted in a Docker named volume (`fleet-db`) across restarts.

To seed historical data inside the running container:
```bash
docker compose exec backend node -e "
  const { IngestionService } = require('./dist/ingestion/ingestion.service');
  // use the seed script instead:
"
# easier: run the seed script before starting compose
cd backend && npm run seed && cd .. && docker compose up --build
```

Or just let the live generator run — it generates an event every 4 seconds automatically.

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
cd backend
npm test
```

This runs 15 unit tests covering the parser, the query/filter logic, and the "critical" aggregation. Frontend tests are pending (see "What I'd do next").

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

## What currently works

- Full REST API: `GET /events` with all filter combinations, `/stats/by-vehicle`, `/stats/by-code`, `/critical`
- Server-Sent Events stream at `/events/stream`
- Seed script + background live generator
- Angular dashboard: filter panel, paginated events table, aggregations view (critical vehicles, top codes bar chart, per-vehicle table)
- Live update banner: counts incoming events, lets you reload without disrupting the current view
- 15 backend unit tests

## What I'd do next

- **Frontend tests**: the Angular side has no tests yet. Priority would be a state service spec testing the switchMap/debounce behavior, then component tests for the filter panel.
- **Cursor pagination**: offset pagination scans the full result set for each page. Fine for 2K–20K rows but would need cursor-based pagination for larger datasets.
- **Auth**: currently zero auth. A real deployment would need at minimum an API key or JWT on the backend.
- **Error recovery in SSE**: the frontend EventSource reconnects automatically on error, but there's no handling for missed events during a gap. A sequence ID and "fetch missed events since sequence N" pattern would fix this.
- **E2E tests**: no Playwright or Cypress setup yet. Would want at minimum: "filter by vehicle ID → correct events shown" and "live banner appears → click load → table refreshes".
- **PostgreSQL**: SQLite is fine for a single-server demo but doesn't support concurrent writes from multiple backend instances. Real fleet deployments would want Postgres.
- **Docker**: docker-compose.yml would simplify dev setup significantly, especially for CI.

## Technical notes

The backend uses `better-sqlite3` for SQLite access — synchronous, prepared statements, and native `db.transaction()` support. It compiles a native addon on install, so Windows requires VS Build Tools 2022 with the C++ workload. Docker builds work out of the box (Alpine has gcc).

Pagination is offset-based. A `// TODO: cursor pagination for large datasets` note is in the repo but not implemented.
