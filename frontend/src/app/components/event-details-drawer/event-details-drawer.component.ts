import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges,
  DestroyRef, inject, HostListener,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of } from 'rxjs';
import { switchMap, map, catchError, startWith } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { LoadState } from '../../services/fleet-state.service';
import { DiagnosticEvent, EventContext } from '../../models/event.model';

@Component({
  selector: 'app-event-details-drawer',
  templateUrl: './event-details-drawer.component.html',
  styleUrls: ['./event-details-drawer.component.scss'],
  standalone: false,
})
export class EventDetailsDrawerComponent implements OnChanges {
  @Input() event: DiagnosticEvent | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() viewVehicle = new EventEmitter<string>();
  @Output() filterCode = new EventEmitter<string>();

  context: LoadState<EventContext> = { data: null, loading: false, error: null };

  private readonly selected$ = new Subject<DiagnosticEvent>();
  private readonly destroyRef = inject(DestroyRef);

  constructor(private readonly api: ApiService) {
    // switchMap cancels the in-flight context request if the user opens another row quickly
    this.selected$
      .pipe(
        switchMap((e) =>
          this.api.getEventContext(e.vehicleId, e.code).pipe(
            map((data) => ({ data, loading: false, error: null })),
            catchError((err: Error) => of({ data: null, loading: false, error: err.message ?? 'Failed to load details' })),
            startWith({ data: null, loading: true, error: null }),
          )
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => (this.context = state));
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['event'] && this.event) {
      this.selected$.next(this.event);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.event) this.close.emit();
  }
}
