import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';
import { FleetStateService } from './services/fleet-state.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss',
})
export class App {
  // The global live banner belongs on the Event Log; the dashboard has its own
  // "new events" indicator inside the Recent Events widget
  readonly showLiveBanner$: Observable<boolean>;

  constructor(
    readonly fleet: FleetStateService,
    readonly theme: ThemeService,
    private readonly router: Router,
  ) {
    this.showLiveBanner$ = this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url.startsWith('/events')),
      startWith(this.router.url.startsWith('/events')),
    );
  }
}
