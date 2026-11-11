import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
} from '@angular/core';

export type IconButtonVariant = 'ghost' | 'filled' | 'outline';

@Component({
  selector: 'button[nx-icon-button], a[nx-icon-button]',
  template: '<ng-content />',
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
      flex: none;
      width: 40px;
      height: 40px;
      border: 1px solid transparent;
      border-radius: var(--nx-radius-pill);
      color: var(--nx-text);
      text-decoration: none;
      cursor: pointer;
      transition:
        background-color var(--nx-duration) var(--nx-ease),
        border-color var(--nx-duration) var(--nx-ease);

      &[disabled] {
        cursor: not-allowed;
        opacity: 0.45;
      }
    }
    :host(.sm) {
      width: 32px;
      height: 32px;
    }
    :host(.ghost:hover:not([disabled])) {
      background: var(--nx-surface-muted);
    }
    :host(.filled) {
      background: var(--nx-navy-900);
      color: var(--nx-text-inverse);
    }
    :host(.filled:hover:not([disabled])) {
      background: var(--nx-navy-700);
    }
    :host(.outline) {
      background: var(--nx-surface);
      border-color: var(--nx-border);
    }
    :host(.outline:hover:not([disabled])) {
      background: var(--nx-surface-muted);
    }
  `,
  host: {
    '[class]': 'classes()',
    '[attr.aria-label]': 'label()',
    '[attr.title]': 'tooltip() ? label() : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxIconButton {
  readonly label = input.required<string>();
  readonly variant = input<IconButtonVariant>('ghost');
  readonly size = input<'sm' | 'md'>('md');
  readonly tooltip = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() => ['nx-icon-button', this.variant(), this.size()]);
}
