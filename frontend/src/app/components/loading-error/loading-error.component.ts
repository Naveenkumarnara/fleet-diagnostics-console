import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-error',
  standalone: false,
  template: `
    <ng-container *ngIf="loading">
      <div class="skeleton-row" *ngFor="let _ of rows" aria-hidden="true">
        <div class="skel skel-sm"></div>
        <div class="skel skel-md"></div>
        <div class="skel skel-xs"></div>
        <div class="skel skel-lg"></div>
      </div>
    </ng-container>
    <div *ngIf="!loading && error" class="error-state" role="alert">
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      <span>{{ error }}</span>
    </div>
  `,
  styles: [`
    .skeleton-row {
      display: flex;
      gap: 16px;
      padding: 10px 0;
      border-bottom: 1px solid rgba(148,163,184,0.05);
    }
    .skel {
      height: 11px;
      border-radius: 4px;
      background: linear-gradient(90deg,
        rgba(148,163,184,0.05) 25%,
        rgba(148,163,184,0.1)  50%,
        rgba(148,163,184,0.05) 75%
      );
      background-size: 400px 100%;
      animation: shimmer 1.6s ease-in-out infinite;
    }
    .skel-xs { width: 48px; }
    .skel-sm { width: 80px; }
    .skel-md { width: 120px; }
    .skel-lg { flex: 1; }
    .error-state {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--error);
      background: var(--error-bg);
      border: 1px solid var(--error-border);
      border-radius: var(--radius-md);
      padding: 10px 14px;
      font-size: 12px;
      margin: 8px 0;
    }
    .error-state svg { width: 15px; height: 15px; flex-shrink: 0; }
  `],
})
export class LoadingErrorComponent {
  @Input() loading = false;
  @Input() error: string | null = null;
  readonly rows = Array(3);
}
