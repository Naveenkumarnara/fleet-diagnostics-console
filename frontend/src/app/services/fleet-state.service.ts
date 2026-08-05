import { Injectable } from '@angular/core';
import { ParamMap } from '@angular/router';
import {
  BehaviorSubject,
  combineLatest,
  Observable,
  Subject,
} from 'rxjs';
import { of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  DiagnosticEvent,
  EventFilters,
  EventsResponse,
  VehicleStats,
  CodeStats,
  CriticalVehicle,
  SortField,
  SortDir,
} from '../models/event.model';

export interface LoadState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class FleetStateService {
  private readonly vehicleIds$ = new BehaviorSubject<string[]>([]);
  private readonly code$       = new BehaviorSubject<string>('');
  private readonly level$      = new BehaviorSubject<string>('');
  private readonly from$       = new BehaviorSubject<string>('');
  private readonly to$         = new BehaviorSubject<string>('');
  private readonly page$       = new BehaviorSubject<number>(0);
  private readonly sortField$  = new BehaviorSubject<SortField>('timestamp');
  private readonly sortDir$    = new BehaviorSubject<SortDir>('desc');
  readonly pageSize = 50;

  private readonly pendingCount$    = new BehaviorSubject<number>(0);
  // Incrementing this triggers a reload of all streams without changing filter state
  private readonly refreshTrigger$  = new BehaviorSubject<number>(0);
  // Fires when filters are set externally (drill-down / URL) so the search panel
  // can patch its form without a valueChanges feedback loop
  private readonly externalChange$  = new Subject<void>();
  readonly externalFilterChange$    = this.externalChange$.asObservable();

  readonly activeFilters$: Observable<EventFilters>;
  readonly events$: Observable<LoadState<EventsResponse>>;
  readonly recentEvents$: Observable<LoadState<DiagnosticEvent[]>>;
  readonly vehicleStats$: Observable<LoadState<VehicleStats[]>>;
  readonly codeSummary$: Observable<LoadState<CodeStats[]>>;
  readonly critical$: Observable<LoadState<CriticalVehicle[]>>;
  readonly liveStream$: Observable<DiagnosticEvent>;
  readonly pendingLiveCount$: Observable<number>;

  constructor(private readonly api: ApiService) {
    this.activeFilters$ = combineLatest([
      this.vehicleIds$.pipe(debounceTime(300), distinctUntilChanged((a, b) => a.join() === b.join())),
      this.code$.pipe(debounceTime(300), distinctUntilChanged()),
      this.level$.pipe(distinctUntilChanged()),
      this.from$.pipe(debounceTime(400), distinctUntilChanged()),
      this.to$.pipe(debounceTime(400), distinctUntilChanged()),
      this.page$.pipe(distinctUntilChanged()),
      this.sortField$.pipe(distinctUntilChanged()),
      this.sortDir$.pipe(distinctUntilChanged()),
      this.refreshTrigger$.pipe(distinctUntilChanged()),
    ]).pipe(
      map(([vehicleIds, code, level, from, to, page, sortField, sortDir]) => ({
        vehicleIds,
        code,
        level,
        from,
        to,
        limit: this.pageSize,
        offset: page * this.pageSize,
        sortField,
        sortDir,
      })),
      shareReplay(1),
    );

    this.events$ = this.activeFilters$.pipe(
      switchMap((filters) =>
        this.api.getEvents(filters).pipe(
          map((data) => ({ data, loading: false, error: null })),
          catchError((err: Error) => of({ data: null, loading: false, error: err.message ?? 'Failed to load events' })),
          startWith({ data: null, loading: true, error: null }),
        )
      ),
      shareReplay(1),
    );

    // Latest 10 matching events for the dashboard widget — reuses getEvents,
    // ignores the table's pagination (always page 0, newest first)
    this.recentEvents$ = this.activeFilters$.pipe(
      switchMap((filters) =>
        this.api.getEvents({ ...filters, limit: 10, offset: 0, sortField: 'timestamp', sortDir: 'desc' }).pipe(
          map((res) => ({ data: res.data, loading: false, error: null })),
          catchError((err: Error) => of({ data: null, loading: false, error: err.message ?? 'Failed to load recent events' })),
          startWith({ data: null, loading: true, error: null }),
        )
      ),
      shareReplay(1),
    );

    this.vehicleStats$ = this.activeFilters$.pipe(
      switchMap((filters) =>
        this.api.getStatsByVehicle(filters.from, filters.to).pipe(
          map((data) => ({ data, loading: false, error: null })),
          catchError((err: Error) => of({ data: null, loading: false, error: err.message ?? 'Failed to load vehicle stats' })),
          startWith({ data: null, loading: true, error: null }),
        )
      ),
      shareReplay(1),
    );

    // codeSummary and critical respond to refreshTrigger so they reload when
    // the user clicks "Load now" on the live banner
    // codeSummary uses activeFilters$ so it respects the active time range
    this.codeSummary$ = this.activeFilters$.pipe(
      switchMap((filters) =>
        this.api.getStatsByCode(filters.from, filters.to).pipe(
          map((data) => ({ data, loading: false, error: null })),
          catchError((err: Error) => of({ data: null, loading: false, error: err.message ?? 'Failed to load code stats' })),
          startWith({ data: null, loading: true, error: null }),
        )
      ),
      shareReplay(1),
    );

    this.critical$ = this.refreshTrigger$.pipe(
      switchMap(() =>
        this.api.getCritical().pipe(
          map((data) => ({ data, loading: false, error: null })),
          catchError((err: Error) => of({ data: null, loading: false, error: err.message ?? 'Failed to load critical vehicles' })),
          startWith({ data: null, loading: true, error: null }),
        )
      ),
      shareReplay(1),
    );

    // Only count live events that match the current filter — otherwise the banner
    // shows "30 new events" while a refresh adds none (backend streams the whole fleet)
    this.liveStream$ = this.api.getLiveStream().pipe(
      tap((event) => {
        if (this.matchesActiveFilter(event)) {
          this.pendingCount$.next(this.pendingCount$.value + 1);
        }
      }),
      shareReplay(1),
    );

    this.pendingLiveCount$ = this.pendingCount$.asObservable();

    this.liveStream$.subscribe();

    // A filter/page change reloads the table with fresh data, so any pending
    // count is stale — clear it. Subscribed here so it runs on every route.
    this.activeFilters$.subscribe(() => this.pendingCount$.next(0));
  }

  // Mirrors the backend's WHERE clause so the count reflects what a refresh
  // would actually add. Timestamps are ISO-UTC strings — lexicographic compare is valid.
  private matchesActiveFilter(e: DiagnosticEvent): boolean {
    const ids = this.vehicleIds$.value;
    if (ids.length && !ids.includes(e.vehicleId)) return false;

    const code = this.code$.value.trim();
    if (code && e.code !== code) return false;

    const level = this.level$.value;
    if (level && e.level !== level) return false;

    const from = this.from$.value;
    if (from && e.timestamp < from) return false;

    const to = this.to$.value;
    if (to && e.timestamp > to) return false;

    return true;
  }

  setVehicleIds(ids: string[]) { this.vehicleIds$.next(ids); this.page$.next(0); }
  setCode(code: string)        { this.code$.next(code); }
  setLevel(level: string)      { this.level$.next(level); this.page$.next(0); }
  setFrom(from: string)        { this.from$.next(from); }
  setTo(to: string)            { this.to$.next(to); }
  setPage(page: number)        { this.page$.next(page); }

  setSort(field: SortField, dir: SortDir) {
    this.sortField$.next(field);
    this.sortDir$.next(dir);
    this.page$.next(0);
  }

  // Applies filters from URL query params (drill-down, deep-link, Back/Forward).
  // Only runs when at least one filter param is present, so navigating to a plain
  // /events (e.g. the nav link) keeps the user's current filters instead of clearing them.
  applyFromParams(p: ParamMap): void {
    const vehicleIds = p.get('vehicleIds');
    const code = p.get('code');
    const level = p.get('level');
    if (vehicleIds === null && code === null && level === null) return;

    this.vehicleIds$.next(vehicleIds ? vehicleIds.split(',').filter(Boolean) : []);
    this.code$.next(code ?? '');
    this.level$.next(level ?? '');
    this.page$.next(0);
    this.externalChange$.next();
  }

  get currentSortField(): SortField { return this.sortField$.value; }
  get currentSortDir(): SortDir     { return this.sortDir$.value; }

  applyLiveUpdates() {
    this.pendingCount$.next(0);
    this.refreshTrigger$.next(this.refreshTrigger$.value + 1);
  }

  get currentFilters(): EventFilters {
    return {
      vehicleIds: this.vehicleIds$.value,
      code: this.code$.value,
      level: this.level$.value,
      from: this.from$.value,
      to: this.to$.value,
      limit: this.pageSize,
      offset: this.page$.value * this.pageSize,
      sortField: this.sortField$.value,
      sortDir: this.sortDir$.value,
    };
  }

  get currentPage(): number { return this.page$.value; }
}
