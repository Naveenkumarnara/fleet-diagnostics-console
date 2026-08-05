import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-live-banner',
  standalone: false,
  template: `
    <div *ngIf="count > 0" class="live-banner" role="status" aria-live="polite">
      <span class="banner-dot"></span>
      <span class="banner-text">
        <strong>{{ count }}</strong> new event{{ count !== 1 ? 's' : '' }} received
      </span>
      <button (click)="apply.emit()" class="apply-btn" aria-label="Load new events">
        Refresh view
      </button>
    </div>
  `,
  styles: [`
    .live-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--success-bg);
      border-top: 1px solid var(--success-border);
      border-bottom: 1px solid var(--success-border);
      color: var(--success);
      padding: 7px 24px;
      font-size: 12px;
      animation: fade-in 0.2s ease;
    }
    .banner-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--success);
      animation: live-pulse 1.5s ease-in-out infinite;
      flex-shrink: 0;
    }
    .banner-text { color: var(--text-secondary); }
    .banner-text strong { color: var(--success); font-weight: 600; }
    .apply-btn {
      margin-left: auto;
      background: var(--success-bg);
      border: 1px solid var(--success-border);
      color: var(--success);
      border-radius: 4px;
      padding: 3px 12px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
      font-family: inherit;
    }
    .apply-btn:hover { filter: brightness(1.1); }
    .apply-btn:focus-visible { outline: 2px solid var(--success); outline-offset: 2px; }
  `],
})
export class LiveBannerComponent {
  @Input() count = 0;
  @Output() apply = new EventEmitter<void>();
}
