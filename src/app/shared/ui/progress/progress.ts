import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ProgressStatus = 'ok' | 'warning' | 'over';

export function progressStatus(value: number, max: number): ProgressStatus {
  if (max <= 0) {
    return value > 0 ? 'over' : 'ok';
  }
  const ratio = value / max;
  if (ratio > 1) {
    return 'over';
  }
  return ratio >= 0.8 ? 'warning' : 'ok';
}

@Component({
  selector: 'nx-progress',
  template: `<span class="bar" [style.width.%]="percent()"></span>`,
  styles: `
    :host {
      display: block;
      height: 8px;
      overflow: hidden;
      border-radius: var(--nx-radius-pill);
      background: var(--nx-surface-muted);
    }
    :host(.md) {
      height: 12px;
    }
    .bar {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--nx-sage-500);
      transition: width 400ms var(--nx-ease);
    }
    :host(.warning) .bar {
      background: #d9a441;
    }
    :host(.over) .bar {
      background: var(--nx-danger);
    }
  `,
  host: {
    role: 'progressbar',
    'aria-valuemin': '0',
    '[attr.aria-valuemax]': 'max()',
    '[attr.aria-valuenow]': 'value()',
    '[attr.aria-valuetext]': 'valueText() || null',
    '[attr.aria-label]': 'label()',
    '[class]': 'classes()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxProgress {
  readonly value = input.required<number>();
  readonly max = input.required<number>();
  readonly label = input.required<string>();
  readonly valueText = input('');
  readonly size = input<'sm' | 'md'>('sm');

  readonly status = computed(() => progressStatus(this.value(), this.max()));

  protected readonly percent = computed(() => {
    const max = this.max();
    if (max <= 0) {
      return this.value() > 0 ? 100 : 0;
    }
    return Math.min(100, Math.max(0, (this.value() / max) * 100));
  });

  protected readonly classes = computed(() => [this.size(), this.status()]);
}
