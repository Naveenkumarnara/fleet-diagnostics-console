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

  levelColor(level: string): string {
    const map: Record<string, string> = { ERROR: '#ff4444', WARN: '#ffaa00', INFO: '#4488ff' };
    return map[level] ?? '#8891aa';
  }

  maxCount(stats: CodeStats[]): number {
    return stats[0]?.count ?? 1;
  }
}
