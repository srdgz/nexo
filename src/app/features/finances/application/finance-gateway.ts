import { InjectionToken } from '@angular/core';
import type { Budget, BudgetDraft } from '../domain/budget';
import type { Category, CategoryDraft } from '../domain/category';
import type { CategoryTotal, DailyTotal, MonthTotals, PeriodSummary } from '../domain/insights';
import type { MonthKey } from '../domain/month';
import type { Page, Transaction, TransactionDraft, TransactionQuery } from '../domain/transaction';

export interface CategoryRepository {
  list(): Promise<Category[]>;
  create(draft: CategoryDraft): Promise<Category>;
  update(id: string, changes: Partial<CategoryDraft> & { archived?: boolean }): Promise<Category>;
  remove(id: string): Promise<void>;
}

export interface TransactionRepository {
  list(query: TransactionQuery): Promise<Page<Transaction>>;
  get(id: string): Promise<Transaction>;
  create(draft: TransactionDraft): Promise<Transaction>;
  update(id: string, draft: TransactionDraft): Promise<Transaction>;
  remove(id: string): Promise<void>;
  countByCategory(month: MonthKey): Promise<Record<string, number>>;
  byTask(taskId: string): Promise<Transaction[]>;
}

export interface BudgetRepository {
  list(month: MonthKey): Promise<Budget[]>;
  create(draft: BudgetDraft): Promise<Budget>;
  update(id: string, amount: number): Promise<Budget>;
  remove(id: string): Promise<void>;
}

export interface InsightsRepository {
  summary(month: MonthKey): Promise<PeriodSummary>;
  expensesByCategory(month: MonthKey): Promise<CategoryTotal[]>;
  trend(lastMonth: MonthKey, months: number): Promise<MonthTotals[]>;
  largestExpenses(month: MonthKey, limit: number): Promise<Transaction[]>;
  dailyExpenses(month: MonthKey): Promise<DailyTotal[]>;
}

export interface FinanceGateway {
  readonly categories: CategoryRepository;
  readonly transactions: TransactionRepository;
  readonly budgets: BudgetRepository;
  readonly insights: InsightsRepository;
}

export const FINANCE_GATEWAY_LOADER = new InjectionToken<() => Promise<FinanceGateway>>(
  'FINANCE_GATEWAY_LOADER',
);
