import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { SearchPanelComponent } from './search-panel.component';
import { FleetStateService } from '../../services/fleet-state.service';

function makeStateMock() {
  return {
    setVehicleIds: vi.fn(),
    setCode:       vi.fn(),
    setLevel:      vi.fn(),
    setFrom:       vi.fn(),
    setTo:         vi.fn(),
    externalFilterChange$: new Subject<void>(),
    currentFilters: { vehicleIds: [], code: '', level: '', from: '', to: '' },
  };
}

describe('SearchPanelComponent', () => {
  let component: SearchPanelComponent;
  let fixture: ComponentFixture<SearchPanelComponent>;
  let stateMock: ReturnType<typeof makeStateMock>;

  beforeEach(async () => {
    stateMock = makeStateMock();

    await TestBed.configureTestingModule({
      declarations: [SearchPanelComponent],
      imports: [ReactiveFormsModule],
      providers: [{ provide: FleetStateService, useValue: stateMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
  });

  it('splits comma-separated vehicleIds into an array', () => {
    component.form.get('vehicleIds')!.setValue('V001, V002, V003');
    expect(stateMock.setVehicleIds).toHaveBeenCalledWith(['V001', 'V002', 'V003']);
  });

  it('passes empty array when vehicleIds field is cleared', () => {
    component.form.get('vehicleIds')!.setValue('V001');
    component.form.get('vehicleIds')!.setValue('');
    expect(stateMock.setVehicleIds).toHaveBeenLastCalledWith([]);
  });

  it('calls setLevel when severity changes', () => {
    component.form.get('level')!.setValue('ERROR');
    expect(stateMock.setLevel).toHaveBeenCalledWith('ERROR');
  });

  it('calls setCode with trimmed value', () => {
    component.form.get('code')!.setValue('  P0300  ');
    expect(stateMock.setCode).toHaveBeenCalledWith('P0300');
  });

  it('passes a UTC ISO string to setFrom (not the raw local datetime)', () => {
    component.form.get('from')!.setValue('2026-08-04T10:00');
    const arg: string = stateMock.setFrom.mock.calls.at(-1)![0];
    expect(arg).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('setTo extends to end of the minute before converting', () => {
    component.form.get('to')!.setValue('2026-08-04T10:00');
    const arg: string = stateMock.setTo.mock.calls.at(-1)![0];
    // seconds should be :59.999 before UTC conversion
    const d = new Date(arg);
    expect(d.getUTCSeconds()).toBe(59);
    expect(d.getUTCMilliseconds()).toBe(999);
  });

  it('reset() clears all form controls and calls state setters with empty values', () => {
    component.form.get('code')!.setValue('P0300');
    component.form.get('level')!.setValue('ERROR');
    component.reset();
    expect(component.form.get('code')!.value).toBeFalsy();
    expect(component.form.get('level')!.value).toBeFalsy();
    expect(stateMock.setCode).toHaveBeenLastCalledWith('');
    expect(stateMock.setLevel).toHaveBeenLastCalledWith('');
  });
});
