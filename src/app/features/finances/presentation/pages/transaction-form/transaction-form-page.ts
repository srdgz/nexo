import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Lightbulb, Trash2 } from 'lucide';
import { NxAlert } from '@shared/ui/alert/alert';
import { NxBadge } from '@shared/ui/badge/badge';
import { NxButton } from '@shared/ui/button/button';
import { NxCard, NxCardHeader } from '@shared/ui/card/card';
import { NxDialog } from '@shared/ui/dialog/dialog';
import { NxErrorState } from '@shared/ui/feedback-state/feedback-state';
import { NxField, NxInput } from '@shared/ui/field/field';
import { NxIcon } from '@shared/ui/icon/icon';
import { NxMoneyInput } from '@shared/ui/money-input/money-input';
import { NxProgress } from '@shared/ui/progress/progress';
import { NxSegmented, type SegmentedOption } from '@shared/ui/segmented/segmented';
import { NxSkeleton } from '@shared/ui/skeleton/skeleton';
import { ToastService } from '@shared/ui/toast/toast';
import { injectActiveLanguage } from '@shared/util/active-language';
import { formatMoney } from '@shared/util/money';
import { CategoriesStore } from '../../../application/categories.store';
import { TASK_LOOKUP } from '../../../application/task-lookup';
import { FinanceService } from '../../../application/finance.service';
import { budgetStatus, budgetUsage } from '../../../domain/budget';
import type { EntryType } from '../../../domain/category';
import { type FinanceErrorCode, toFinanceError } from '../../../domain/finance-error';
import { type MonthKey, isIsoDate, isoDate, monthOfDate } from '../../../domain/month';
import { DESCRIPTION_MAX, type Transaction, isValidAmount } from '../../../domain/transaction';
import { NxCategoryTile } from '../../components/category-tile';
import { financeMessageKey } from '../../finance-messages';
import { formatMonthInline } from '@shared/ui/month-picker/month-picker';

interface TransactionModel {
  type: EntryType;
  amount: number | null;
  categoryId: string;
  date: string;
  description: string;
  taskId: string;
}

@Component({
  selector: 'nx-transaction-form-page',
  imports: [
    FormField,
    NxAlert,
    NxBadge,
    NxButton,
    NxCard,
    NxCardHeader,
    NxCategoryTile,
    NxDialog,
    NxErrorState,
    NxField,
    NxIcon,
    NxInput,
    NxMoneyInput,
    NxProgress,
    NxSegmented,
    NxSkeleton,
    RouterLink,
    TranslocoPipe,
  ],
  templateUrl: './transaction-form-page.html',
  styleUrl: './transaction-form-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionFormPage {
  readonly id = input<string>();
  readonly type = input<string>();
  readonly returnUrl = input<string>();
  readonly task = input<string>();
  readonly amount = input<string>();
  readonly category = input<string>();
  readonly description = input<string>();

  protected readonly categories = inject(CategoriesStore);
  private readonly finance = inject(FinanceService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly language = injectActiveLanguage();

  protected readonly icons = { tip: Lightbulb, remove: Trash2 };
  protected readonly messageKey = financeMessageKey;

  protected readonly existing = resource({
    params: () => this.id() || undefined,
    loader: ({ params }) => this.finance.transaction(params),
  });

  protected readonly model = signal<TransactionModel>({
    type: 'expense',
    amount: null,
    categoryId: '',
    date: isoDate(new Date()),
    description: '',
    taskId: '',
  });

  protected readonly draft = form(this.model, (path) => {
    required(path.amount);
    validate(path.amount, ({ value }) =>
      value() !== null && !isValidAmount(value()) ? { kind: 'amount' } : undefined,
    );
    required(path.categoryId);
    required(path.date);
    validate(path.date, ({ value }) =>
      value() && !isIsoDate(value()) ? { kind: 'date' } : undefined,
    );
    maxLength(path.description, DESCRIPTION_MAX);
  });

  protected readonly typeOptions = computed<readonly SegmentedOption<EntryType>[]>(() => {
    this.language();
    return [
      { value: 'expense', label: this.transloco.translate('finances.typeSingular.expense') },
      { value: 'income', label: this.transloco.translate('finances.typeSingular.income') },
    ];
  });

  private readonly taskLookup = inject(TASK_LOOKUP);
  protected readonly tasks = resource({
    loader: () => this.taskLookup.options(),
  });
  protected readonly taskOptions = computed(() => {
    const current = this.model().taskId;
    const options = this.tasks.hasValue() ? this.tasks.value() : [];
    return options.filter((option) => option.open || option.id === current);
  });

  protected readonly categoryOptions = computed(() => {
    const { type, categoryId } = this.model();
    return this.categories
      .all()
      .filter(
        (category) => category.type === type && (!category.archived || category.id === categoryId),
      );
  });

  protected readonly error = signal<FinanceErrorCode | null>(null);
  protected readonly removeOpen = signal(false);
  protected readonly removing = signal(false);

  private readonly month = computed<MonthKey | null>(() => {
    const date = this.model().date;
    return isIsoDate(date) ? monthOfDate(date) : null;
  });

  protected readonly budget = resource({
    params: () => {
      const { type, categoryId } = this.model();
      const month = this.month();
      return type === 'expense' && categoryId && month
        ? { categoryId, month, version: this.finance.version() }
        : undefined;
    },
    loader: ({ params }) => this.finance.budgetFor(params.categoryId, params.month),
  });

  protected readonly impact = computed(() => {
    if (!this.budget.hasValue()) {
      return null;
    }
    const row = this.budget.value();
    const { categoryId, amount } = this.model();
    if (!row) {
      return { category: this.categories.find(categoryId), budget: null };
    }
    const original = this.existing.hasValue() ? this.existing.value() : null;
    const counted =
      original &&
      original.type === 'expense' &&
      original.categoryId === categoryId &&
      monthOfDate(original.date) === row.budget.month
        ? original.amount
        : 0;
    const after = row.spent - counted + (amount ?? 0);
    return {
      category: this.categories.find(categoryId),
      budget: {
        amount: row.budget.amount,
        after,
        usage: budgetUsage(after, row.budget.amount),
        status: budgetStatus(after, row.budget.amount),
        left: row.budget.amount - after,
      },
    };
  });

  constructor() {
    effect(() => {
      const requested = this.type();
      const prefill = {
        taskId: this.task() ?? '',
        amount: Number(this.amount()),
        categoryId: this.category() ?? '',
        description: this.description() ?? '',
      };
      if (!this.id()) {
        untracked(() =>
          this.model.update((model) => ({
            ...model,
            type: requested === 'income' ? 'income' : 'expense',
            taskId: prefill.taskId,
            amount: isValidAmount(prefill.amount) ? prefill.amount : model.amount,
            categoryId: prefill.categoryId || model.categoryId,
            description: prefill.description.slice(0, DESCRIPTION_MAX) || model.description,
          })),
        );
      }
    });

    effect(() => {
      if (this.existing.hasValue()) {
        const transaction = this.existing.value();
        untracked(() => this.load(transaction));
      }
    });

    effect(() => {
      const { type, categoryId } = this.model();
      const category = this.categories.find(categoryId);
      if (categoryId && category && category.type !== type) {
        untracked(() => this.model.update((model) => ({ ...model, categoryId: '' })));
      }
    });
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.language());
  }

  protected monthLabel(): string {
    const month = this.month();
    return month ? formatMonthInline(month, this.language()) : '';
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(null);
    await submit(this.draft, async () => {
      const value = this.model();
      const impact = this.impact();
      try {
        const saved = await this.finance.saveTransaction(this.id() ?? null, {
          type: value.type,
          categoryId: value.categoryId,
          amount: value.amount ?? 0,
          date: value.date,
          description: value.description,
          taskId: value.taskId || null,
        });
        this.toast.success(this.savedMessage(saved, impact));
        await this.router.navigateByUrl(this.backUrl(saved));
      } catch (error) {
        this.error.set(toFinanceError(error).code);
      }
      return undefined;
    });
  }

  protected async remove(): Promise<void> {
    const id = this.id();
    if (!id) {
      return;
    }
    this.removing.set(true);
    try {
      await this.finance.removeTransaction(id);
      this.removeOpen.set(false);
      this.toast.success(this.transloco.translate('finances.transactions.deleted'));
      await this.router.navigateByUrl(this.backUrl(null));
    } catch (error) {
      this.removeOpen.set(false);
      this.error.set(toFinanceError(error).code);
    } finally {
      this.removing.set(false);
    }
  }

  protected backUrl(saved: Transaction | null): string {
    const returnUrl = this.returnUrl();
    if (returnUrl?.startsWith('/app/') && !returnUrl.startsWith('//')) {
      return returnUrl;
    }
    const month = saved ? monthOfDate(saved.date) : this.month();
    return `/app/finances/transactions${month ? `?month=${month}` : ''}`;
  }

  private load(transaction: Transaction): void {
    this.model.set({
      type: transaction.type,
      amount: transaction.amount,
      categoryId: transaction.categoryId,
      date: transaction.date,
      description: transaction.description ?? '',
      taskId: transaction.taskId ?? '',
    });
  }

  private savedMessage(saved: Transaction, impact: ReturnType<typeof this.impact>): string {
    if (this.id()) {
      return this.transloco.translate('finances.transactions.updated');
    }
    const base = this.transloco.translate(
      saved.type === 'expense'
        ? 'finances.transactions.savedExpense'
        : 'finances.transactions.savedIncome',
    );
    if (impact?.budget && impact.budget.status !== 'ok' && impact.category) {
      return `${base}. ${this.transloco.translate('finances.transactions.budgetUsed', {
        usage: impact.budget.usage,
        name: impact.category.name,
      })}`;
    }
    return base;
  }
}
