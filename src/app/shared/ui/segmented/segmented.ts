import { ChangeDetectionStrategy, Component, booleanAttribute, input, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { uniqueId } from '../../util/unique-id';

export interface SegmentedOption<T> {
  readonly value: T;
  readonly label: string;
}

@Component({
  selector: 'nx-segmented',
  template: `
    @for (option of options(); track option.value) {
      <label class="segment" [class.selected]="option.value === value()">
        <input
          type="radio"
          class="nx-visually-hidden"
          [name]="groupName"
          [checked]="option.value === value()"
          [disabled]="disabled()"
          (change)="value.set(option.value)"
        />
        {{ option.label }}
      </label>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      padding: 3px;
      border-radius: var(--nx-radius-pill);
      background: var(--nx-surface-muted);
    }
    .segment {
      position: relative;
      padding: 6px 14px;
      border-radius: var(--nx-radius-pill);
      color: var(--nx-text-muted);
      font-size: var(--nx-text-sm);
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      transition:
        background-color var(--nx-duration) var(--nx-ease),
        color var(--nx-duration) var(--nx-ease);
    }
    .segment.selected {
      background: var(--nx-surface);
      color: var(--nx-text);
      font-weight: 600;
      box-shadow: 0 1px 3px rgb(24 43 53 / 0.12);
    }
    .segment:has(:focus-visible) {
      outline: var(--nx-focus-ring);
      outline-offset: 2px;
    }
    .segment:has(:disabled) {
      cursor: not-allowed;
      opacity: 0.5;
    }
    :host(.md) .segment {
      padding: 8px 18px;
      font-size: var(--nx-text-md);
    }
  `,
  host: {
    role: 'radiogroup',
    '[attr.aria-label]': 'label()',
    '[class]': 'size()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxSegmented<T> implements FormValueControl<T> {
  readonly value = model.required<T>();
  readonly options = input.required<readonly SegmentedOption<T>[]>();
  readonly label = input.required<string>();
  readonly size = input<'sm' | 'md'>('sm');
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly groupName = uniqueId('nx-segmented');
}
