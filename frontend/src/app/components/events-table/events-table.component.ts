import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FleetStateService, LoadState } from '../../services/fleet-state.service';
import { EventsResponse } from '../../models/event.model';

@Component({
  selector: 'app-events-table',
  templateUrl: './events-table.component.html',
  styleUrls: ['./events-table.component.scss'],
  standalone: false,
})
export class EventsTableComponent implements OnInit {
  state$!: Observable<LoadState<EventsResponse>>;
  totalPages$!: Observable<number>;

  constructor(readonly fleet: FleetStateService) {}

  ngOnInit() {
    this.state$ = this.fleet.events$;
    this.totalPages$ = this.fleet.events$.pipe(
      map((s) => (s.data ? Math.ceil(s.data.total / this.fleet.pageSize) : 0)),
    );
  }

  get currentPage() { return this.fleet.currentPage; }

  prevPage() {
    if (this.fleet.currentPage > 0) this.fleet.setPage(this.fleet.currentPage - 1);
  }

  nextPage(total: number) {
    const maxPage = Math.ceil(total / this.fleet.pageSize) - 1;
    if (this.fleet.currentPage < maxPage) this.fleet.setPage(this.fleet.currentPage + 1);
  }

  levelClass(level: string): string {
    return level.toLowerCase();
  }
}
