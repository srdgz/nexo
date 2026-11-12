import type { EntryType } from './category';
import type { MonthKey } from './month';

export const MAX_AMOUNT_CENTS = 999_999_999_999;
export const DESCRIPTION_MAX = 200;
export const PAGE_SIZE = 20;

export interface Transaction {
  readonly id: string;
  readonly type: EntryType;
  readonly categoryId: string;
  readonly taskId: string | null;
  readonly amount: number;
  readonly date: string;
  readonly description: string | null;
}

export type TransactionDraft = Omit<Transaction, 'id'>;

export interface TransactionQuery {
  readonly month: MonthKey;
  readonly type: EntryType | null;
  readonly categoryId: string | null;
  readonly search: string;
  readonly page: number;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly total: number;
}

export function isValidAmount(cents: number | null | undefined): cents is number {
  return (
    typeof cents === 'number' && Number.isInteger(cents) && cents > 0 && cents <= MAX_AMOUNT_CENTS
  );
}

export function signedAmount(transaction: Pick<Transaction, 'type' | 'amount'>): number {
  return transaction.type === 'expense' ? -transaction.amount : transaction.amount;
}

export function pageCount(total: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function normalizeDescription(value: string | null | undefined): string | null {
  const text = (value ?? '').trim();
  return text ? text.slice(0, DESCRIPTION_MAX) : null;
}

export function matchesQuery(transaction: Transaction, query: TransactionQuery): boolean {
  if (!transaction.date.startsWith(query.month)) {
    return false;
  }
  if (query.type && transaction.type !== query.type) {
    return false;
  }
  if (query.categoryId && transaction.categoryId !== query.categoryId) {
    return false;
  }
  const search = query.search.trim().toLocaleLowerCase();
  return !search || (transaction.description ?? '').toLocaleLowerCase().includes(search);
}

export function compareByDateDesc(a: Transaction, b: Transaction): number {
  return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
}
