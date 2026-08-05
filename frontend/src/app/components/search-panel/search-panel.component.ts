import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup } from '@angular/forms';
import { FleetStateService } from '../../services/fleet-state.service';

@Component({
  selector: 'app-search-panel',
  templateUrl: './search-panel.component.html',
  styleUrls: ['./search-panel.component.scss'],
  standalone: false,
})
export class SearchPanelComponent implements OnInit {
  form!: FormGroup;

  readonly levels = ['', 'ERROR', 'WARN', 'INFO'];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private fb: FormBuilder,
    private state: FleetStateService,
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      vehicleIds: [''],
      code: [''],
      level: [''],
      from: [''],
      to: [''],
    });

    // When a drill-down / URL sets filters, reflect them in the form without
    // re-emitting (emitEvent: false) so we don't loop back into the state setters
    this.state.externalFilterChange$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const f = this.state.currentFilters;
        this.form.patchValue(
          { vehicleIds: f.vehicleIds.join(', '), code: f.code, level: f.level },
          { emitEvent: false },
        );
      });

    // Vehicle IDs: comma-separated input, debounce handled in state service
    this.form.get('vehicleIds')!.valueChanges.subscribe((v: string) => {
      const ids = v
        ? v.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      this.state.setVehicleIds(ids);
    });

    this.form.get('code')!.valueChanges.subscribe((v: string) => {
      this.state.setCode(v?.trim() ?? '');
    });

    this.form.get('level')!.valueChanges.subscribe((v: string) => {
      this.state.setLevel(v ?? '');
    });

    this.form.get('from')!.valueChanges.subscribe((v: string) => {
      // datetime-local gives local time with no timezone — convert to UTC ISO
      this.state.setFrom(v ? new Date(v).toISOString() : '');
    });

    this.form.get('to')!.valueChanges.subscribe((v: string) => {
      // Extend to end of the selected minute so events at e.g. 14:00:45 aren't excluded
      this.state.setTo(v ? new Date(v + ':59.999').toISOString() : '');
    });
  }

  reset() {
    this.form.reset({ vehicleIds: '', code: '', level: '', from: '', to: '' });
  }
}
