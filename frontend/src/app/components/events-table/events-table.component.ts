import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
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

  selectedEvent: DiagnosticEvent | null = null;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    readonly fleet: FleetStateService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit() {
    this.state$ = this.fleet.events$;
    this.totalPages$ = this.fleet.events$.pipe(
      map((s) => (s.data ? Math.ceil(s.data.total / this.fleet.pageSize) : 0)),
    );

    // Query params drive filters on drill-down, deep-link, and Back/Forward
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.fleet.applyFromParams(params));
  }

  openDrawer(event: DiagnosticEvent) {
    this.selectedEvent = event;
  }

  closeDrawer() {
    this.selectedEvent = null;
  }

  // Drawer actions route through query params (same path as drill-down) so the
  // filter panel stays in sync and Back works
  onViewVehicle(vehicleId: string) {
    this.router.navigate(['/events'], { queryParams: { vehicleIds: vehicleId } });
    this.closeDrawer();
  }

  onFilterCode(code: string) {
    this.router.navigate(['/events'], { queryParams: { code } });
    this.closeDrawer();
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
