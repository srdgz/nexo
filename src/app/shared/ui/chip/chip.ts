import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';

@Component({
  selector: 'button[nx-chip]',
  template: `
    <ng-content />
    @if (count() !== null) {
      <span class="count">{{ count() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 32px;
      padding: 0 12px;
      border: 1px solid var(--nx-border);
      border-radius: var(--nx-radius-pill);
      background: var(--nx-surface);
      font-size: var(--nx-text-sm);
      font-weight: 500;
      white-space: nowrap;
      transition:
        background-color var(--nx-duration) var(--nx-ease),
        color var(--nx-duration) var(--nx-ease);
    }
    :host(:hover) {
      background: var(--nx-surface-muted);
    }
    :host([aria-pressed='true']) {
      background: var(--nx-navy-900);
      border-color: var(--nx-navy-900);
      color: var(--nx-text-inverse);
    }
    .count {
      padding: 0 6px;
      border-radius: var(--nx-radius-pill);
      background: var(--nx-surface-muted);
      color: var(--nx-text);
      font-size: var(--nx-text-xs);
      font-variant-numeric: tabular-nums;
    }
    :host([aria-pressed='true']) .count {
      background: var(--nx-navy-700);
      color: var(--nx-text-inverse);
    }
  `,
  host: {
    type: 'button',
    '[attr.aria-pressed]': 'selected()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxChip {
  readonly selected = input(false, { transform: booleanAttribute });
  readonly count = input<number | null>(null);
}
