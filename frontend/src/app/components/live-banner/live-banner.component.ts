import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-live-banner',
  standalone: false,
  template: `
    <div *ngIf="count > 0" class="live-banner" role="status" aria-live="polite">
      <span>{{ count }} new event{{ count !== 1 ? 's' : '' }} arrived</span>
      <button (click)="apply.emit()" class="apply-btn" aria-label="Load new events">Load now</button>
    </div>
  `,
  styles: [`
    .live-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #1a2a1a;
      border: 1px solid #2a5a2a;
      color: #6ecf6e;
      padding: 8px 16px;
      font-size: 13px;
      border-radius: 4px;
      margin: 8px 20px;
    }
    .apply-btn {
      background: #2a5a2a;
      border: 1px solid #3a7a3a;
      color: #6ecf6e;
      border-radius: 4px;
      padding: 3px 10px;
      font-size: 12px;
      cursor: pointer;
      &:hover { background: #3a7a3a; }
      &:focus-visible { outline: 2px solid #6ecf6e; outline-offset: 2px; }
    }
  `],
})
export class LiveBannerComponent {
  @Input() count = 0;
  @Output() apply = new EventEmitter<void>();
}
