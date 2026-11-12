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
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { NxAlert } from '@shared/ui/alert/alert';
import { NxButton } from '@shared/ui/button/button';
import { NxDialog } from '@shared/ui/dialog/dialog';
import { NxField, NxInput } from '@shared/ui/field/field';
import { NxMoneyInput } from '@shared/ui/money-input/money-input';
import { formatMonthInline } from '@shared/ui/month-picker/month-picker';
import { ToastService } from '@shared/ui/toast/toast';
import { injectActiveLanguage } from '@shared/util/active-language';
import { CategoriesStore } from '../../application/categories.store';
import { FinanceService } from '../../application/finance.service';
import type { Budget } from '../../domain/budget';
import { toFinanceError } from '../../domain/finance-error';
import type { MonthKey } from '../../domain/month';
import { isValidAmount } from '../../domain/transaction';
import { financeMessageKey } from '../finance-messages';

@Component({
  selector: 'nx-budget-dialog',
  imports: [FormField, NxAlert, NxButton, NxDialog, NxField, NxInput, NxMoneyInput, TranslocoPipe],
  template: `
    <nx-dialog
      size="sm"
      [heading]="(budget() ? 'finances.budgets.edit' : 'finances.budgets.new') | transloco"
      [(open)]="open"
    >
      <form class="form" novalidate (submit)="onSubmit($event)">
        @if (errorKey(); as key) {
          <nx-alert tone="danger">{{ key | transloco }}</nx-alert>
        }
        @if (budget(); as current) {
          <p class="fixed">
            <span class="muted">{{ 'finances.budgets.category' | transloco }}</span>
            <b>{{ categories.find(current.categoryId)?.name }}</b>
          </p>
        } @else {
          <nx-field
            [label]="'finances.budgets.category' | transloco"
            [hint]="'finances.budgets.onlyFree' | transloco: { month: monthLabel() }"
            [state]="draft.categoryId()"
          >
            <select nxInput [formField]="draft.categoryId">
              <option value="" disabled>
                {{ 'finances.transactions.chooseCategory' | transloco }}
              </option>
              @for (category of available(); track category.id) {
                <option [value]="category.id">{{ category.name }}</option>
              }
            </select>
          </nx-field>
        }
        <nx-field [label]="'finances.budgets.amount' | transloco" [state]="draft.amount()">
          <nx-money-input size="lg" [formField]="draft.amount" />
        </nx-field>
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
        {{ (budget() ? 'finances.save' : 'finances.budgets.create') | transloco }}
      </button>
    </nx-dialog>
  `,
  styles: `
    .form {
      display: grid;
      gap: var(--nx-space-5);
    }
    .fixed {
      display: grid;
      gap: 2px;
    }
    .muted {
      color: var(--nx-text-muted);
      font-size: var(--nx-text-sm);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxBudgetDialog {
  readonly open = model(false);
  readonly budget = input<Budget | null>(null);
  readonly month = input.required<MonthKey>();
  readonly taken = input<readonly string[]>([]);

  protected readonly categories = inject(CategoriesStore);
  private readonly finance = inject(FinanceService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly language = injectActiveLanguage();

  private readonly model = signal<{ categoryId: string; amount: number | null }>({
    categoryId: '',
    amount: null,
  });
  protected readonly draft = form(this.model, (path) => {
    validate(path.categoryId, ({ value }) =>
      !this.budget() && !value() ? { kind: 'required' } : undefined,
    );
    required(path.amount);
    validate(path.amount, ({ value }) =>
      value() !== null && !isValidAmount(value()) ? { kind: 'amount' } : undefined,
    );
  });
  protected readonly errorKey = signal<string | null>(null);

  protected readonly available = computed(() => {
    const taken = new Set(this.taken());
    return this.categories.active('expense').filter((category) => !taken.has(category.id));
  });

  protected readonly monthLabel = computed(() => formatMonthInline(this.month(), this.language()));

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const budget = this.budget();
      untracked(() => {
        this.errorKey.set(null);
        this.model.set({ categoryId: budget?.categoryId ?? '', amount: budget?.amount ?? null });
        this.draft().reset();
      });
    });
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.errorKey.set(null);
    await submit(this.draft, async () => {
      const { categoryId, amount } = this.model();
      const budget = this.budget();
      try {
        if (budget) {
          await this.finance.updateBudget(budget.id, amount ?? 0);
        } else {
          await this.finance.createBudget(categoryId, amount ?? 0, this.month());
        }
        this.toast.success(this.transloco.translate('finances.budgets.saved'));
        this.open.set(false);
        return undefined;
      } catch (error) {
        const code = toFinanceError(error).code;
        if (code === 'duplicate') {
          return {
            kind: 'duplicate',
            message: this.transloco.translate('finances.budgets.duplicate', {
              month: this.monthLabel(),
            }),
            fieldTree: this.draft.categoryId,
          };
        }
        this.errorKey.set(financeMessageKey(code));
        return undefined;
      }
    });
  }
}
