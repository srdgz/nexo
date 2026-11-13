import { Injectable, inject, signal } from '@angular/core';
import type { Budget } from '../domain/budget';
import type { Category, CategoryDraft } from '../domain/category';
import { normalizeCategoryName } from '../domain/category';
import { FinanceError } from '../domain/finance-error';
import type { CategoryTotal, DailyTotal, MonthTotals, PeriodSummary } from '../domain/insights';
import { type MonthKey, monthOfDate } from '../domain/month';
import {
  type Page,
  type Transaction,
  type TransactionDraft,
  type TransactionFilter,
  type TransactionQuery,
  isValidAmount,
  normalizeDescription,
} from '../domain/transaction';
import { FINANCE_GATEWAY_LOADER, type FinanceGateway } from './finance-gateway';

export interface BudgetWithSpending {
  readonly budget: Budget;
  readonly spent: number;
}

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly loader = inject(FINANCE_GATEWAY_LOADER);
  private gatewayPromise: Promise<FinanceGateway> | null = null;
  private readonly revision = signal(0);

  readonly version = this.revision.asReadonly();

  private gateway(): Promise<FinanceGateway> {
    this.gatewayPromise ??= this.loader();
    return this.gatewayPromise;
  }

  private async mutate<T>(action: (gateway: FinanceGateway) => Promise<T>): Promise<T> {
    const result = await action(await this.gateway());
    this.revision.update((value) => value + 1);
    return result;
  }

  async categories(): Promise<Category[]> {
    return (await this.gateway()).categories.list();
  }

  createCategory(draft: CategoryDraft): Promise<Category> {
    return this.mutate((gateway) =>
      gateway.categories.create({ ...draft, name: normalizeCategoryName(draft.name) }),
    );
  }

  updateCategory(id: string, draft: CategoryDraft): Promise<Category> {
    return this.mutate((gateway) =>
      gateway.categories.update(id, { ...draft, name: normalizeCategoryName(draft.name) }),
    );
  }

  setCategoryArchived(id: string, archived: boolean): Promise<Category> {
    return this.mutate((gateway) => gateway.categories.update(id, { archived }));
  }

  removeCategory(id: string): Promise<void> {
    return this.mutate((gateway) => gateway.categories.remove(id));
  }

  async transactions(query: TransactionQuery): Promise<Page<Transaction>> {
    return (await this.gateway()).transactions.list(query);
  }

  async transaction(id: string): Promise<Transaction> {
    return (await this.gateway()).transactions.get(id);
  }

  async countByCategory(month: MonthKey): Promise<Record<string, number>> {
    return (await this.gateway()).transactions.countByCategory(month);
  }

  async transactionsForTask(taskId: string): Promise<Transaction[]> {
    return (await this.gateway()).transactions.byTask(taskId);
  }

  saveTransaction(id: string | null, draft: TransactionDraft): Promise<Transaction> {
    if (!isValidAmount(draft.amount)) {
      return Promise.reject(new FinanceError('invalid'));
    }
    const clean = { ...draft, description: normalizeDescription(draft.description) };
    return this.mutate((gateway) =>
      id ? gateway.transactions.update(id, clean) : gateway.transactions.create(clean),
    );
  }

  async allTransactions(filter: TransactionFilter): Promise<Transaction[]> {
    return (await this.gateway()).transactions.listAll(filter);
  }

  importTransactions(drafts: readonly TransactionDraft[]): Promise<number> {
    if (drafts.length === 0 || drafts.some((draft) => !isValidAmount(draft.amount))) {
      return Promise.reject(new FinanceError('invalid'));
    }
    const clean = drafts.map((draft) => ({
      ...draft,
      description: normalizeDescription(draft.description),
    }));
    return this.mutate((gateway) => gateway.transactions.createMany(clean));
  }

  removeTransaction(id: string): Promise<void> {
    return this.mutate((gateway) => gateway.transactions.remove(id));
  }

  async budgets(month: MonthKey): Promise<BudgetWithSpending[]> {
    const gateway = await this.gateway();
    const [budgets, totals] = await Promise.all([
      gateway.budgets.list(month),
      gateway.insights.expensesByCategory(month),
    ]);
    const spentBy = new Map(totals.map((total) => [total.categoryId, total.total]));
    return budgets.map((budget) => ({ budget, spent: spentBy.get(budget.categoryId) ?? 0 }));
  }

  async budgetFor(categoryId: string, month: MonthKey): Promise<BudgetWithSpending | null> {
    const rows = await this.budgets(month);
    return rows.find((row) => row.budget.categoryId === categoryId) ?? null;
  }

  createBudget(categoryId: string, amount: number, month: MonthKey): Promise<Budget> {
    if (!isValidAmount(amount)) {
      return Promise.reject(new FinanceError('invalid'));
    }
    return this.mutate((gateway) => gateway.budgets.create({ categoryId, amount, month }));
  }

  updateBudget(id: string, amount: number): Promise<Budget> {
    if (!isValidAmount(amount)) {
      return Promise.reject(new FinanceError('invalid'));
    }
    return this.mutate((gateway) => gateway.budgets.update(id, amount));
  }

  removeBudget(id: string): Promise<void> {
    return this.mutate((gateway) => gateway.budgets.remove(id));
  }

  async copyBudgets(from: MonthKey, to: MonthKey): Promise<number> {
    const gateway = await this.gateway();
    const [previous, current] = await Promise.all([
      gateway.budgets.list(from),
      gateway.budgets.list(to),
    ]);
    const taken = new Set(current.map((budget) => budget.categoryId));
    const missing = previous.filter((budget) => !taken.has(budget.categoryId));
    await this.mutate((target) =>
      Promise.all(
        missing.map((budget) =>
          target.budgets.create({
            categoryId: budget.categoryId,
            amount: budget.amount,
            month: to,
          }),
        ),
      ),
    );
    return missing.length;
  }

  async summary(month: MonthKey): Promise<PeriodSummary> {
    return (await this.gateway()).insights.summary(month);
  }

  async expensesByCategory(month: MonthKey): Promise<CategoryTotal[]> {
    return (await this.gateway()).insights.expensesByCategory(month);
  }

  async trend(lastMonth: MonthKey, months: number): Promise<MonthTotals[]> {
    return (await this.gateway()).insights.trend(lastMonth, months);
  }

  async dailyExpenses(month: MonthKey): Promise<DailyTotal[]> {
    return (await this.gateway()).insights.dailyExpenses(month);
  }

  async largestExpenses(month: MonthKey, limit = 5): Promise<Transaction[]> {
    return (await this.gateway()).insights.largestExpenses(month, limit);
  }

  monthOf(transaction: Pick<Transaction, 'date'>): MonthKey {
    return monthOfDate(transaction.date);
  }
}
