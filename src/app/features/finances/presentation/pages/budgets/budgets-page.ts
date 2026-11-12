import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Copy, Ellipsis, Pencil, Plus, Trash2, Wallet } from 'lucide';
import { NxAlert } from '@shared/ui/alert/alert';
import { NxBadge } from '@shared/ui/badge/badge';
import { NxButton } from '@shared/ui/button/button';
import { NxCard } from '@shared/ui/card/card';
import { NxDialog } from '@shared/ui/dialog/dialog';
import { NxEmptyState, NxErrorState } from '@shared/ui/feedback-state/feedback-state';
import { NxIcon } from '@shared/ui/icon/icon';
import { NxIconButton } from '@shared/ui/icon-button/icon-button';
import { NxMenu, NxMenuItem, NxMenuSeparator, NxMenuTrigger } from '@shared/ui/menu/menu';
import { formatMonthInline } from '@shared/ui/month-picker/month-picker';
import { NxProgress } from '@shared/ui/progress/progress';
import { NxSkeleton } from '@shared/ui/skeleton/skeleton';
import { ToastService } from '@shared/ui/toast/toast';
import { injectActiveLanguage } from '@shared/util/active-language';
import { formatMoney } from '@shared/util/money';
import { CategoriesStore } from '../../../application/categories.store';
import { FinanceService } from '../../../application/finance.service';
import {
  type Budget,
  type BudgetStatus,
  budgetStatus,
  budgetTotals,
  budgetUsage,
} from '../../../domain/budget';
import { type FinanceErrorCode, toFinanceError } from '../../../domain/finance-error';
import { addMonths, toMonthKey } from '../../../domain/month';
import { NxBudgetDialog } from '../../components/budget-dialog';
import { NxCategoryTile } from '../../components/category-tile';
import { financeMessageKey } from '../../finance-messages';

@Component({
  selector: 'nx-budgets-page',
  imports: [
    NxAlert,
    NxBadge,
    NxBudgetDialog,
    NxButton,
    NxCard,
    NxCategoryTile,
    NxDialog,
    NxEmptyState,
    NxErrorState,
    NxIcon,
    NxIconButton,
    NxMenu,
    NxMenuItem,
    NxMenuSeparator,
    NxMenuTrigger,
    NxProgress,
    NxSkeleton,
    TranslocoPipe,
  ],
  templateUrl: './budgets-page.html',
  styleUrl: './budgets-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetsPage {
  readonly month = input<string>();

  protected readonly categories = inject(CategoriesStore);
  private readonly finance = inject(FinanceService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly language = injectActiveLanguage();

  protected readonly icons = {
    plus: Plus,
    copy: Copy,
    more: Ellipsis,
    edit: Pencil,
    remove: Trash2,
    empty: Wallet,
  };
  protected readonly messageKey = financeMessageKey;

  protected readonly current = computed(() => toMonthKey(this.month(), new Date()));
  protected readonly previous = computed(() => addMonths(this.current(), -1));

  protected readonly budgets = resource({
    params: () => ({ month: this.current(), version: this.finance.version() }),
    loader: ({ params }) => this.finance.budgets(params.month),
  });

  private readonly previousBudgets = resource({
    params: () =>
      this.budgets.hasValue() && this.budgets.value().length === 0
        ? { month: this.previous(), version: this.finance.version() }
        : undefined,
    loader: ({ params }) => this.finance.budgets(params.month),
  });

  protected readonly canCopy = computed(
    () => this.previousBudgets.hasValue() && this.previousBudgets.value().length > 0,
  );

  protected readonly rows = computed(() => {
    if (!this.budgets.hasValue()) {
      return [];
    }
    return this.budgets
      .value()
      .map(({ budget, spent }) => ({
        budget,
        spent,
        category: this.categories.find(budget.categoryId),
        usage: budgetUsage(spent, budget.amount),
        status: budgetStatus(spent, budget.amount),
      }))
      .sort((a, b) => (a.category?.name ?? '').localeCompare(b.category?.name ?? ''));
  });

  protected readonly totals = computed(() =>
    budgetTotals(this.rows().map((row) => ({ amount: row.budget.amount, spent: row.spent }))),
  );

  protected readonly taken = computed(() => this.rows().map((row) => row.budget.categoryId));

  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Budget | null>(null);
  protected readonly removing = signal<Budget | null>(null);
  protected readonly removeOpen = signal(false);
  protected readonly removeError = signal<FinanceErrorCode | null>(null);
  protected readonly busy = signal(false);

  protected money(cents: number): string {
    return formatMoney(cents, this.language());
  }

  protected monthLabel(month: string): string {
    return formatMonthInline(month, this.language());
  }

  protected tone(status: BudgetStatus): 'success' | 'warning' | 'danger' {
    return status === 'over' ? 'danger' : status === 'warning' ? 'warning' : 'success';
  }

  protected create(): void {
    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  protected edit(budget: Budget): void {
    this.editing.set(budget);
    this.dialogOpen.set(true);
  }

  protected askRemove(budget: Budget): void {
    this.removing.set(budget);
    this.removeError.set(null);
    this.removeOpen.set(true);
  }

  protected async remove(): Promise<void> {
    const budget = this.removing();
    if (!budget) {
      return;
    }
    this.busy.set(true);
    this.removeError.set(null);
    try {
      await this.finance.removeBudget(budget.id);
      this.removeOpen.set(false);
      this.toast.success(this.transloco.translate('finances.budgets.deleted'));
    } catch (error) {
      this.removeError.set(toFinanceError(error).code);
    } finally {
      this.busy.set(false);
    }
  }

  protected async copyPrevious(): Promise<void> {
    this.busy.set(true);
    try {
      const count = await this.finance.copyBudgets(this.previous(), this.current());
      this.toast.success(this.transloco.translate('finances.budgets.copied', { count }));
    } catch (error) {
      this.toast.error(this.transloco.translate(financeMessageKey(toFinanceError(error).code)));
    } finally {
      this.busy.set(false);
    }
  }
}
