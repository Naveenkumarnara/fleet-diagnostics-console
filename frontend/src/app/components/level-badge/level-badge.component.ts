import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-level-badge',
  standalone: false,
  template: `<span class="level-badge" [attr.data-level]="level">{{ level }}</span>`,
  styles: [`
    .level-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      white-space: nowrap;
    }
    .level-badge[data-level="ERROR"] {
      background: var(--error-bg); color: var(--error); border: 1px solid var(--error-border);
    }
    .level-badge[data-level="WARN"] {
      background: var(--warn-bg); color: var(--warn); border: 1px solid var(--warn-border);
    }
    .level-badge[data-level="INFO"] {
      background: var(--info-bg); color: var(--info); border: 1px solid rgba(59,130,246,0.2);
    }
  `],
})
export class LevelBadgeComponent {
  @Input() level!: string;
}
