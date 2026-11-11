import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

@Component({
  selector: 'nx-tab-nav',
  template: '<ng-content />',
  styles: `
    :host {
      display: flex;
      gap: 22px;
      overflow-x: auto;
      border-bottom: 1px solid var(--nx-border);
      scrollbar-width: none;
    }
    :host(.pill) {
      gap: var(--nx-space-1);
      padding: 3px;
      border: 0;
      border-radius: var(--nx-radius-pill);
      background: var(--nx-surface-muted);
    }
  `,
  host: {
    role: 'navigation',
    '[attr.aria-label]': 'label()',
    '[class]': 'variant()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxTabNav {
  readonly label = input.required<string>();
  readonly variant = input<'underline' | 'pill'>('underline');
}

@Component({
  selector: 'a[nx-tab]',
  template: '<ng-content />',
  styles: `
    :host {
      flex: none;
      padding: 0 0 10px;
      color: var(--nx-text-muted);
      font-size: var(--nx-text-md);
      font-weight: 500;
      text-decoration: none;
      white-space: nowrap;
    }
    :host(:hover),
    :host([aria-current='page']) {
      color: var(--nx-text);
    }
    :host([aria-current='page']) {
      font-weight: 600;
      box-shadow: inset 0 -2px var(--nx-navy-900);
    }
    :host(.pill) {
      padding: 6px 14px;
      border-radius: var(--nx-radius-pill);
      font-size: var(--nx-text-sm);
    }
    :host(.pill[aria-current='page']) {
      background: var(--nx-surface);
      box-shadow: 0 1px 3px rgb(24 43 53 / 0.12);
    }
  `,
  host: { '[class.pill]': 'nav?.variant() === "pill"' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxTab {
  protected readonly nav = inject(NxTabNav, { optional: true });
}
