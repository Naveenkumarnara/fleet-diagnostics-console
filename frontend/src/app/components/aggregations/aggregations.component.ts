import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { FleetStateService, LoadState } from '../../services/fleet-state.service';
import { VehicleStats, CodeStats, CriticalVehicle } from '../../models/event.model';

@Component({
  selector: 'app-aggregations',
  templateUrl: './aggregations.component.html',
  styleUrls: ['./aggregations.component.scss'],
  standalone: false,
})
export class AggregationsComponent implements OnInit {
  vehicleStats$!: Observable<LoadState<VehicleStats[]>>;
  codeSummary$!: Observable<LoadState<CodeStats[]>>;
  critical$!: Observable<LoadState<CriticalVehicle[]>>;

  constructor(private fleet: FleetStateService) {}

  ngOnInit() {
    this.vehicleStats$ = this.fleet.vehicleStats$;
    this.codeSummary$  = this.fleet.codeSummary$;
    this.critical$     = this.fleet.critical$;
  }

  maxCount(stats: CodeStats[]): number {
    return stats[0]?.count ?? 1;
  }

  totalErrors(stats: VehicleStats[]): number {
    return stats.reduce((sum, v) => sum + v.errorCount, 0);
  }

  errorRate(stats: VehicleStats[]): string {
    const total  = stats.reduce((sum, v) => sum + v.total, 0);
    const errors = stats.reduce((sum, v) => sum + v.errorCount, 0);
    if (!total) return '0';
    return ((errors / total) * 100).toFixed(1);
  }
}
