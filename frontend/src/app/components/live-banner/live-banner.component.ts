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
      background: rgba(52,211,153,0.06);
      border-top: 1px solid rgba(52,211,153,0.15);
      border-bottom: 1px solid rgba(52,211,153,0.15);
      color: #34d399;
      padding: 7px 24px;
      font-size: 12px;
      animation: fade-in 0.2s ease;
    }
    .banner-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #34d399;
      animation: live-pulse 1.5s ease-in-out infinite;
      flex-shrink: 0;
    }
    .banner-text { color: #94a3b8; }
    .banner-text strong { color: #34d399; font-weight: 600; }
    .apply-btn {
      margin-left: auto;
      background: rgba(52,211,153,0.12);
      border: 1px solid rgba(52,211,153,0.3);
      color: #34d399;
      border-radius: 4px;
      padding: 3px 12px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
      font-family: inherit;
    }
    .apply-btn:hover { background: rgba(52,211,153,0.2); }
    .apply-btn:focus-visible { outline: 2px solid #34d399; outline-offset: 2px; }
  `],
})
export class LiveBannerComponent {
  @Input() count = 0;
  @Output() apply = new EventEmitter<void>();
}
