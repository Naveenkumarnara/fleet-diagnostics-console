import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { FleetStateService, LoadState } from '../../services/fleet-state.service';
import { DiagnosticEvent } from '../../models/event.model';

@Component({
  selector: 'app-recent-events',
  templateUrl: './recent-events.component.html',
  styleUrls: ['./recent-events.component.scss'],
  standalone: false,
})
export class RecentEventsComponent implements OnInit {
  state$!: Observable<LoadState<DiagnosticEvent[]>>;
  pending$!: Observable<number>;

  private newIds = new Set<number>();
  private lastIds = new Set<number>();
  // only highlight rows that appear as a direct result of the user clicking Refresh —
  // not on initial load or a filter change
  private expectHighlight = false;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    readonly fleet: FleetStateService,
    private readonly router: Router,
  ) {}

  ngOnInit() {
    this.state$ = this.fleet.recentEvents$;
    this.pending$ = this.fleet.pendingLiveCount$;

    this.fleet.recentEvents$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((s) => {
        if (!s.data) return;
        const incoming = s.data.map((e) => e.id);
        if (this.expectHighlight) {
          this.newIds = new Set(incoming.filter((id) => !this.lastIds.has(id)));
          this.expectHighlight = false;
          if (this.newIds.size) setTimeout(() => (this.newIds = new Set()), 1500);
        }
        this.lastIds = new Set(incoming);
      });
  }

  isNew(id: number): boolean {
    return this.newIds.has(id);
  }

  refresh() {
    this.expectHighlight = true;
    this.fleet.applyLiveUpdates();
  }

  viewAll() {
    this.router.navigate(['/events']);
  }

  trackById(_: number, event: DiagnosticEvent): number {
    return event.id;
  }
}
