import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FleetStateService, LoadState } from '../../services/fleet-state.service';
import { DiagnosticEvent, EventsResponse, SortField } from '../../models/event.model';

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

  get currentPage()    { return this.fleet.currentPage; }
  get currentSort()    { return this.fleet.currentSortField; }
  get currentSortDir() { return this.fleet.currentSortDir; }

  sort(field: SortField) {
    const dir = this.fleet.currentSortField === field && this.fleet.currentSortDir === 'desc'
      ? 'asc'
      : 'desc';
    this.fleet.setSort(field, dir);
  }

  sortIcon(field: SortField): string {
    if (this.fleet.currentSortField !== field) return '↕';
    return this.fleet.currentSortDir === 'asc' ? '↑' : '↓';
  }

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

  trackById(_: number, event: DiagnosticEvent): number {
    return event.id;
  }
}
