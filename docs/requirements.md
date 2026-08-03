# Requirements

## Business/customer requirements

1. Operations engineers need a real-time view of diagnostic events across a fleet of connected vehicles.
2. Events must be filterable by vehicle ID (one or many), error code, severity, and time range simultaneously.
3. The system must surface which vehicles are currently in a "critical" state — defined as having received 3 or more ERROR-level events within the last 15 minutes. Both thresholds must be configurable without a code change.
4. Aggregated views (most frequent codes, per-vehicle error counts) must update when the time range filter changes.
5. Live events from vehicles must appear in the UI without requiring a manual page refresh; the user should be informed before their current view is disrupted.
6. The system must support querying historical data across multiple days.
7. The API must reject malformed query parameters with a meaningful error, not a 500.

## Assumptions and decisions

**Data model extensions**
- Added `subsystem` field, derived from the first character of the diagnostic code (P = Powertrain, U = Network/Communication, C = Chassis, B = Body, E = EV/Hybrid). This lets operators filter by system area without knowing every code.
- Kept `mileage` in the schema as a nullable field. The input format doesn't include it, but it's a natural field for vehicle diagnostics and having the column there costs nothing.

**What "critical" means**
- A vehicle is critical if it has ≥ 3 ERROR-level events in the last 15 minutes.
- Configurable via `CRITICAL_ERROR_THRESHOLD` and `CRITICAL_WINDOW_MINUTES` env vars.
- This is a point-in-time snapshot, not a persistent state — a vehicle falls out of "critical" automatically once its errors age out of the window. This is intentional: there's no "acknowledge" workflow, and maintaining a separate state table would require more complexity than the scope warrants.

**Pagination**
- Offset-based (`limit`/`offset`). Cursor-based would be better for large datasets with frequent inserts since offset scans are O(n), but offset is much simpler and fine for the volumes expected here. Noted in README.

**Live updates (SSE vs WebSocket)**
- SSE chosen over WebSocket. SSE is HTTP/1.1 compatible, requires no special server config, and the data flow is one-directional (server → client). WebSocket makes sense when the client also needs to send data over the same connection; there's no such need here.

**Time handling**
- All timestamps stored and returned as ISO 8601 UTC strings. Conversion to local time is left to the frontend (`date` pipe with browser locale). The alternative (storing in local time) creates ambiguity problems at DST transitions.

**SQLite vs PostgreSQL**
- SQLite keeps the setup to a single `npm install` with no external process. For a portfolio project demonstrating querying and aggregation, it's fine. A real fleet deployment would want PostgreSQL (concurrent writes, replication). Noted in README.

**Frontend state management**
- Used RxJS + a service (no NgRx). NgRx adds significant boilerplate for this scale; the state is simple enough that a service with BehaviorSubjects and reactive derivations is cleaner and easier to trace. The choice is documented in concept.md.

**Filter behavior**
- Filters are applied reactively (no explicit search button). Text inputs are debounced by 300ms; date pickers by 400ms. The level/vehicle-id selects apply immediately since they're not free-text. Resetting the form clears all filters and returns to the first page.
