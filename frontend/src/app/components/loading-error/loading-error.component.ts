import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-error',
  standalone: false,
  template: `
    <div *ngIf="loading" class="state-box loading" role="status" aria-live="polite">
      Loading...
    </div>
    <div *ngIf="!loading && error" class="state-box error" role="alert">
      {{ error }}
    </div>
  `,
  styles: [`
    .state-box {
      padding: 20px;
      text-align: center;
      font-size: 14px;
      border-radius: 6px;
      margin: 16px 0;
    }
    .loading { color: #8891aa; background: #1e2130; }
    .error   { color: #ff6b6b; background: #2a1a1a; border: 1px solid #5a2020; }
  `],
})
export class LoadingErrorComponent {
  @Input() loading = false;
  @Input() error: string | null = null;
}
