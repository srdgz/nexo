import { ChangeDetectionStrategy, Component, booleanAttribute, input, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import { NxIcon } from '@shared/ui/icon/icon';
import { uniqueId } from '@shared/util/unique-id';
import { CATEGORY_COLORS, CATEGORY_ICONS, type CategoryColor } from '../../domain/category';
import { categoryIcon } from './category-tile';

const PICKER_STYLES = `
  :host {
    display: grid;
    gap: 8px;
  }
  .legend {
    font-size: var(--nx-text-sm);
    font-weight: 600;
  }
  .options {
    display: grid;
    gap: 6px;
  }
  .option {
    position: relative;
    display: grid;
    place-items: center;
    aspect-ratio: 1;
    border: 1.5px solid transparent;
    border-radius: 12px;
    cursor: pointer;
    transition:
      border-color var(--nx-duration) var(--nx-ease),
      background-color var(--nx-duration) var(--nx-ease);
  }
  .option:has(:checked) {
    border-color: var(--nx-text);
  }
  .option:has(:focus-visible) {
    outline: var(--nx-focus-ring);
    outline-offset: 2px;
  }
  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
`;

@Component({
  selector: 'nx-icon-picker',
  imports: [NxIcon, TranslocoPipe],
  template: `
    <span class="legend" [id]="labelId">{{ 'finances.categories.icon' | transloco }}</span>
    <div class="options" role="radiogroup" [attr.aria-labelledby]="labelId">
      @for (icon of icons; track icon) {
        <label class="option" [title]="'finances.icons.' + icon | transloco">
          <input
            type="radio"
            [name]="groupName"
            [checked]="value() === icon"
            [disabled]="disabled()"
            [attr.aria-label]="'finances.icons.' + icon | transloco"
            (change)="value.set(icon)"
          />
          <svg nx-icon [icon]="node(icon)" size="18"></svg>
        </label>
      }
    </div>
  `,
  styles: `
    ${PICKER_STYLES}
    .options {
      grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
    }
    .option {
      background: var(--nx-surface-muted);
    }
    .option:hover {
      background: var(--nx-highlight);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxIconPicker implements FormValueControl<string> {
  readonly value = model('circle');
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly icons = CATEGORY_ICONS;
  protected readonly groupName = uniqueId('nx-icon-picker');
  protected readonly labelId = `${this.groupName}-label`;
  protected readonly node = categoryIcon;
}

@Component({
  selector: 'nx-color-picker',
  imports: [TranslocoPipe],
  template: `
    <span class="legend" [id]="labelId">{{ 'finances.categories.color' | transloco }}</span>
    <div class="options" role="radiogroup" [attr.aria-labelledby]="labelId">
      @for (color of colors; track color) {
        <label class="option" [style.background]="'var(--nx-cat-' + color + ')'">
          <input
            type="radio"
            [name]="groupName"
            [checked]="value() === color"
            [disabled]="disabled()"
            [attr.aria-label]="'finances.colors.' + color | transloco"
            (change)="value.set(color)"
          />
        </label>
      }
    </div>
  `,
  styles: `
    ${PICKER_STYLES}
    .options {
      grid-template-columns: repeat(8, minmax(28px, 40px));
    }
    .option {
      border-radius: 50%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxColorPicker implements FormValueControl<CategoryColor> {
  readonly value = model<CategoryColor>('sand');
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly colors = CATEGORY_COLORS;
  protected readonly groupName = uniqueId('nx-color-picker');
  protected readonly labelId = `${this.groupName}-label`;
}
