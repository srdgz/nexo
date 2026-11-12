import type { Budget } from '../../domain/budget';
import { type Category, type EntryType, isCategoryColor } from '../../domain/category';
import { FinanceError } from '../../domain/finance-error';
import { type MonthKey, monthOfDate } from '../../domain/month';
import type { Transaction } from '../../domain/transaction';

export interface CategoryRow {
  id: string;
  name: string;
  type: EntryType;
  icon: string;
  color: string;
  is_archived: boolean;
}

export interface TransactionRow {
  id: string;
  type: EntryType;
  category_id: string;
  task_id: string | null;
  amount: number | string;
  transaction_date: string;
  description: string | null;
}

export interface BudgetRow {
  id: string;
  category_id: string;
  amount: number | string;
  period_start: string;
}

export const CATEGORY_COLUMNS = 'id, name, type, icon, color, is_archived';
export const TRANSACTION_COLUMNS =
  'id, type, category_id, task_id, amount, transaction_date, description';
export const BUDGET_COLUMNS = 'id, category_id, amount, period_start';

export function toCents(amount: number | string): number {
  return Math.round(Number(amount) * 100);
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon,
    color: isCategoryColor(row.color) ? row.color : 'sand',
    archived: row.is_archived,
  };
}

export function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    categoryId: row.category_id,
    taskId: row.task_id,
    amount: toCents(row.amount),
    date: row.transaction_date,
    description: row.description,
  };
}

export function mapBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    categoryId: row.category_id,
    amount: toCents(row.amount),
    month: monthOfDate(row.period_start) as MonthKey,
  };
}

export function mapFinanceError(error: unknown): FinanceError {
  if (error instanceof FinanceError) {
    return error;
  }
  const code = (error as { code?: string } | null)?.code;
  switch (code) {
    case '23505':
      return new FinanceError('duplicate');
    case '23503':
    case '23001':
      return new FinanceError('in_use');
    case '23514':
    case '22P02':
      return new FinanceError('invalid');
    case 'PGRST116':
      return new FinanceError('not_found');
  }
  if (error instanceof TypeError) {
    return new FinanceError('network');
  }
  const message = (error as { message?: string } | null)?.message ?? '';
  return new FinanceError(/fetch|network/i.test(message) ? 'network' : 'unknown');
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
