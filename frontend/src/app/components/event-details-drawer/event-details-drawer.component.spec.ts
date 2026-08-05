import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { EventDetailsDrawerComponent } from './event-details-drawer.component';
import { LevelBadgeComponent } from '../level-badge/level-badge.component';
import { LoadingErrorComponent } from '../loading-error/loading-error.component';
import { RelativeTimePipe } from '../../pipes/relative-time.pipe';
import { ApiService } from '../../services/api.service';
import { DiagnosticEvent, EventContext } from '../../models/event.model';

const mockEvent: DiagnosticEvent = {
  id: 7, timestamp: '2026-08-05T10:00:00.000Z',
  vehicleId: 'V003', level: 'ERROR', code: 'U0100',
  message: 'Lost comms', subsystem: 'Network/Communication', mileage: null,
};

const mockContext: EventContext = {
  occurrencesToday: 5,
  lastOccurrence: '2026-08-05T09:00:00.000Z',
  vehicleCritical: true,
  related: [mockEvent],
};

describe('EventDetailsDrawerComponent', () => {
  let component: EventDetailsDrawerComponent;
  let fixture: ComponentFixture<EventDetailsDrawerComponent>;
  let apiMock: { getEventContext: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    apiMock = { getEventContext: vi.fn().mockReturnValue(of(mockContext)) };

    await TestBed.configureTestingModule({
      declarations: [EventDetailsDrawerComponent, LevelBadgeComponent, LoadingErrorComponent, RelativeTimePipe],
      providers: [{ provide: ApiService, useValue: apiMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(EventDetailsDrawerComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('fetches context when an event is set', () => {
    component.event = mockEvent;
    component.ngOnChanges({ event: { currentValue: mockEvent, previousValue: null, firstChange: true, isFirstChange: () => true } });
    expect(apiMock.getEventContext).toHaveBeenCalledWith('V003', 'U0100');
    expect(component.context.data).toEqual(mockContext);
    expect(component.context.loading).toBe(false);
  });

  it('emits viewVehicle / filterCode from actions', () => {
    const vehicleSpy = vi.fn();
    const codeSpy = vi.fn();
    component.viewVehicle.subscribe(vehicleSpy);
    component.filterCode.subscribe(codeSpy);
    component.viewVehicle.emit('V003');
    component.filterCode.emit('U0100');
    expect(vehicleSpy).toHaveBeenCalledWith('V003');
    expect(codeSpy).toHaveBeenCalledWith('U0100');
  });

  it('Escape closes the drawer when open', () => {
    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);
    component.event = mockEvent;
    component.onEscape();
    expect(closeSpy).toHaveBeenCalled();
  });
});
