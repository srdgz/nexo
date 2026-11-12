import type { MonthKey } from './month';

export type BudgetStatus = 'ok' | 'warning' | 'over';

export const BUDGET_WARNING_RATIO = 0.8;

export interface Budget {
  readonly id: string;
  readonly categoryId: string;
  readonly amount: number;
  readonly month: MonthKey;
}

export interface BudgetDraft {
  readonly categoryId: string;
  readonly amount: number;
  readonly month: MonthKey;
}

export function budgetUsage(spent: number, amount: number): number {
  if (amount <= 0) {
    return spent > 0 ? 100 : 0;
  }
  return Math.round((spent / amount) * 100);
}

export function budgetStatus(spent: number, amount: number): BudgetStatus {
  if (spent > amount) {
    return 'over';
  }
  return amount > 0 && spent / amount >= BUDGET_WARNING_RATIO ? 'warning' : 'ok';
}

export interface BudgetTotals {
  readonly budgeted: number;
  readonly spent: number;
  readonly available: number;
}

export function budgetTotals(
  rows: readonly { readonly amount: number; readonly spent: number }[],
): BudgetTotals {
  const budgeted = rows.reduce((sum, row) => sum + row.amount, 0);
  const spent = rows.reduce((sum, row) => sum + row.spent, 0);
  return { budgeted, spent, available: budgeted - spent };
}
