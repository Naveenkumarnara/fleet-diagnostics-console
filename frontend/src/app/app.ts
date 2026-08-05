import { Component } from '@angular/core';
import { FleetStateService } from './services/fleet-state.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss',
})
export class App {
  constructor(
    readonly fleet: FleetStateService,
    readonly theme: ThemeService,
  ) {}
}
