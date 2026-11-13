import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'navy';
export type BadgeAppearance = 'soft' | 'solid' | 'dot' | 'outline';

@Component({
  selector: 'nx-badge',
  template: `
    @if (appearance() === 'dot') {
      <span class="dot" aria-hidden="true"></span>
    }
    <ng-content />
  `,
  styles: `
    :host {
      --tone: var(--nx-text);
      --tone-bg: var(--nx-surface-muted);

      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 9px;
      border: 1px solid transparent;
      border-radius: var(--nx-radius-pill);
      font-size: var(--nx-text-xs);
      font-weight: 600;
      line-height: 1.3;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    :host(.success) {
      --tone: var(--nx-success);
      --tone-bg: var(--nx-success-bg);
    }
    :host(.warning) {
      --tone: var(--nx-warning);
      --tone-bg: var(--nx-warning-bg);
    }
    :host(.danger) {
      --tone: var(--nx-danger);
      --tone-bg: var(--nx-danger-bg);
    }
    :host(.info) {
      --tone: var(--nx-info);
      --tone-bg: var(--nx-info-bg);
    }
    :host(.navy) {
      --tone: var(--nx-primary);
      --tone-bg: var(--nx-primary-soft);
    }
    :host(.soft) {
      background: var(--tone-bg);
      color: var(--tone);
    }
    :host(.solid) {
      background: var(--tone);
      color: var(--nx-surface);
    }
    :host(.neutral.solid) {
      background: var(--nx-text-muted);
    }
    :host(.outline) {
      border-color: var(--nx-border);
      color: var(--tone);
    }
    :host(.dot) {
      padding-inline: 2px;
      color: var(--nx-text);
      font-weight: 500;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--tone);
    }
  `,
  host: { '[class]': 'classes()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxBadge {
  readonly tone = input<BadgeTone>('neutral');
  readonly appearance = input<BadgeAppearance>('soft');

  protected readonly classes = computed(() => [this.tone(), this.appearance()]);
}
