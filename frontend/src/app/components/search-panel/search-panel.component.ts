import { Component, OnInit } from '@angular/core';
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
      this.state.setFrom(v ?? '');
    });

    this.form.get('to')!.valueChanges.subscribe((v: string) => {
      this.state.setTo(v ?? '');
    });
  }

  reset() {
    this.form.reset({ vehicleIds: '', code: '', level: '', from: '', to: '' });
  }
}
