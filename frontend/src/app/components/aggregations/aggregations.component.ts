import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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

  constructor(
    private fleet: FleetStateService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.vehicleStats$ = this.fleet.vehicleStats$;
    this.codeSummary$  = this.fleet.codeSummary$;
    this.critical$     = this.fleet.critical$;
  }

  private drillDown(params: Record<string, string>) {
    this.router.navigate(['/events'], { queryParams: params });
  }

  drillErrors() {
    this.drillDown({ level: 'ERROR' });
  }

  drillCritical(vehicles: CriticalVehicle[]) {
    if (!vehicles.length) return;
    this.drillDown({ vehicleIds: vehicles.map((v) => v.vehicleId).join(','), level: 'ERROR' });
  }

  drillActiveVehicles(stats: VehicleStats[]) {
    if (!stats.length) return;
    this.drillDown({ vehicleIds: stats.map((v) => v.vehicleId).join(',') });
  }

  drillVehicle(vehicleId: string) {
    this.drillDown({ vehicleIds: vehicleId });
  }

  drillCode(code: string) {
    this.drillDown({ code });
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
