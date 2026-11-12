import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { NxAlert } from '@shared/ui/alert/alert';
import { NxButton } from '@shared/ui/button/button';
import { NxDialog } from '@shared/ui/dialog/dialog';
import { NxField, NxInput } from '@shared/ui/field/field';
import { NxSegmented, type SegmentedOption } from '@shared/ui/segmented/segmented';
import { ToastService } from '@shared/ui/toast/toast';
import { injectActiveLanguage } from '@shared/util/active-language';
import { FinanceService } from '../../application/finance.service';
import {
  CATEGORY_NAME_MAX,
  type Category,
  type CategoryColor,
  type EntryType,
} from '../../domain/category';
import { toFinanceError } from '../../domain/finance-error';
import { financeMessageKey } from '../finance-messages';
import { NxColorPicker, NxIconPicker } from './category-pickers';

interface CategoryModel {
  name: string;
  type: EntryType;
  icon: string;
  color: CategoryColor;
}

@Component({
  selector: 'nx-category-dialog',
  imports: [
    FormField,
    NxAlert,
    NxButton,
    NxColorPicker,
    NxDialog,
    NxField,
    NxIconPicker,
    NxInput,
    NxSegmented,
    TranslocoPipe,
  ],
  template: `
    <nx-dialog
      [heading]="(category() ? 'finances.categories.edit' : 'finances.categories.new') | transloco"
      [(open)]="open"
    >
      <form class="form" novalidate (submit)="onSubmit($event)">
        @if (errorKey(); as key) {
          <nx-alert tone="danger">{{ key | transloco }}</nx-alert>
        }
        <nx-field [label]="'finances.categories.name' | transloco" [state]="draft.name()">
          <input nxInput type="text" autocomplete="off" [formField]="draft.name" />
        </nx-field>
        <nx-segmented
          size="md"
          [label]="'finances.categories.type' | transloco"
          [options]="types()"
          [formField]="draft.type"
        />
        <nx-icon-picker [formField]="draft.icon" />
        <nx-color-picker [formField]="draft.color" />
      </form>
      <button nx-button variant="secondary" dialog-actions type="button" (click)="open.set(false)">
        {{ 'finances.cancel' | transloco }}
      </button>
      <button
        nx-button
        dialog-actions
        type="button"
        [loading]="draft().submitting()"
        (click)="onSubmit($event)"
      >
        {{ 'finances.save' | transloco }}
      </button>
    </nx-dialog>
  `,
  styles: `
    .form {
      display: grid;
      gap: var(--nx-space-5);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxCategoryDialog {
  readonly open = model(false);
  readonly category = input<Category | null>(null);
  readonly defaultType = input<EntryType>('expense');

  private readonly finance = inject(FinanceService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly language = injectActiveLanguage();

  private readonly model = signal<CategoryModel>({
    name: '',
    type: 'expense',
    icon: 'circle',
    color: 'sand',
  });
  protected readonly draft = form(this.model, (path) => {
    required(path.name);
    maxLength(path.name, CATEGORY_NAME_MAX);
  });
  protected readonly errorKey = signal<string | null>(null);
  protected readonly types = computed<readonly SegmentedOption<EntryType>[]>(() => {
    this.language();
    return [
      { value: 'expense', label: this.transloco.translate('finances.typeSingular.expense') },
      { value: 'income', label: this.transloco.translate('finances.typeSingular.income') },
    ];
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const category = this.category();
      const type = this.defaultType();
      untracked(() => {
        this.errorKey.set(null);
        this.model.set(
          category
            ? {
                name: category.name,
                type: category.type,
                icon: category.icon,
                color: category.color,
              }
            : {
                name: '',
                type,
                icon: type === 'income' ? 'coins' : 'shopping-cart',
                color: 'sage',
              },
        );
        this.draft().reset();
      });
    });
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.errorKey.set(null);
    await submit(this.draft, async () => {
      const category = this.category();
      try {
        if (category) {
          await this.finance.updateCategory(category.id, this.model());
        } else {
          await this.finance.createCategory(this.model());
        }
        this.toast.success(this.transloco.translate('finances.categories.saved'));
        this.open.set(false);
        return undefined;
      } catch (error) {
        const code = toFinanceError(error).code;
        if (code === 'duplicate') {
          return {
            kind: 'duplicate',
            message: this.transloco.translate('finances.categories.duplicateName'),
            fieldTree: this.draft.name,
          };
        }
        this.errorKey.set(
          code === 'in_use' ? 'finances.categories.typeLocked' : financeMessageKey(code),
        );
        return undefined;
      }
    });
  }
}
