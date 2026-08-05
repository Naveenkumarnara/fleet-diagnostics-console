import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { FleetStateService } from './fleet-state.service';
import { ApiService } from './api.service';
import { DiagnosticEvent } from '../models/event.model';

const mockEvent: DiagnosticEvent = {
  id: 1, timestamp: '2026-08-04T10:00:00.000Z',
  vehicleId: 'V001', level: 'ERROR', code: 'P0300',
  message: 'Misfire', subsystem: 'Powertrain', mileage: null,
};

const emptyResponse = { data: [], total: 0 };

function makeApiMock(liveSubject: Subject<DiagnosticEvent>) {
  return {
    getEvents:        vi.fn().mockReturnValue(of(emptyResponse)),
    getStatsByVehicle:vi.fn().mockReturnValue(of([])),
    getStatsByCode:   vi.fn().mockReturnValue(of([])),
    getCritical:      vi.fn().mockReturnValue(of([])),
    getLiveStream:    vi.fn().mockReturnValue(liveSubject.asObservable()),
  };
}

describe('FleetStateService', () => {
  let service: FleetStateService;
  let apiMock: ReturnType<typeof makeApiMock>;
  let live$: Subject<DiagnosticEvent>;

  beforeEach(() => {
    live$ = new Subject<DiagnosticEvent>();
    apiMock = makeApiMock(live$);

    TestBed.configureTestingModule({
      providers: [
        FleetStateService,
        { provide: ApiService, useValue: apiMock },
      ],
    });

    service = TestBed.inject(FleetStateService);
  });

  it('events$ emits a loading state before the HTTP response arrives', async () => {
    const state = await firstValueFrom(service.events$);
    expect(state.loading).toBe(true);
    expect(state.data).toBeNull();
  });

  it('events$ emits data state after API responds', async () => {
    apiMock.getEvents.mockReturnValue(of(emptyResponse));
    // skip the startWith emission (loading=true) and take the data emission
    const state = await new Promise<any>((resolve) => {
      let count = 0;
      service.events$.subscribe((s) => {
        count++;
        if (count === 2) resolve(s); // 1st = loading, 2nd = data
      });
    });
    expect(state.loading).toBe(false);
    expect(state.data).toEqual(emptyResponse);
    expect(state.error).toBeNull();
  });

  it('events$ emits error state when API throws', async () => {
    apiMock.getEvents.mockReturnValue(throwError(() => new Error('Network error')));
    const state = await new Promise<any>((resolve) => {
      let count = 0;
      service.events$.subscribe((s) => {
        count++;
        if (count === 2) resolve(s);
      });
    });
    expect(state.error).toBe('Network error');
    expect(state.loading).toBe(false);
    expect(state.data).toBeNull();
  });

  it('pendingLiveCount$ starts at 0', async () => {
    const count = await firstValueFrom(service.pendingLiveCount$);
    expect(count).toBe(0);
  });

  it('pendingLiveCount$ increments when a live event arrives', async () => {
    live$.next(mockEvent);
    const count = await firstValueFrom(service.pendingLiveCount$);
    expect(count).toBe(1);
  });

  it('does NOT count a live event that fails the active vehicle filter', async () => {
    service.setVehicleIds(['V002']);        // event is V001 — should be ignored
    live$.next(mockEvent);
    const count = await firstValueFrom(service.pendingLiveCount$);
    expect(count).toBe(0);
  });

  it('counts a live event that matches the active vehicle filter', async () => {
    service.setVehicleIds(['V001']);
    live$.next(mockEvent);
    const count = await firstValueFrom(service.pendingLiveCount$);
    expect(count).toBe(1);
  });

  it('does NOT count a live event whose level differs from the active filter', async () => {
    service.setLevel('WARN');               // event is ERROR — should be ignored
    live$.next(mockEvent);
    const count = await firstValueFrom(service.pendingLiveCount$);
    expect(count).toBe(0);
  });

  it('applyLiveUpdates resets pendingCount to 0', async () => {
    live$.next(mockEvent);
    live$.next(mockEvent);
    service.applyLiveUpdates();
    const count = await firstValueFrom(service.pendingLiveCount$);
    expect(count).toBe(0);
  });

  it('applyLiveUpdates triggers a re-fetch of critical and codeSummary', async () => {
    // subscribe to activate the stream, then count calls after refresh
    service.critical$.subscribe();
    service.codeSummary$.subscribe();
    const callsBefore = apiMock.getCritical.mock.calls.length;
    service.applyLiveUpdates();
    await new Promise((r) => setTimeout(r, 0));
    expect(apiMock.getCritical.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('setLevel resets page to 0', () => {
    service.setPage(3);
    service.setLevel('ERROR');
    expect(service.currentPage).toBe(0);
  });

  it('setVehicleIds resets page to 0', () => {
    service.setPage(2);
    service.setVehicleIds(['V001']);
    expect(service.currentPage).toBe(0);
  });

  it('currentFilters reflects current state', () => {
    service.setCode('P0300');
    service.setLevel('WARN');
    const filters = service.currentFilters;
    expect(filters.code).toBe('P0300');
    expect(filters.level).toBe('WARN');
  });
});
