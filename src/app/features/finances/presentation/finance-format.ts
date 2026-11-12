import { localeFor } from '@shared/util/active-language';
import { formatMoney } from '@shared/util/money';
import { isoDate } from '../domain/month';
import type { Transaction } from '../domain/transaction';

const MINUS = '−';

export function signedMoney(
  transaction: Pick<Transaction, 'type' | 'amount'>,
  language: string,
): string {
  const value = formatMoney(transaction.amount, language);
  return transaction.type === 'expense' ? `${MINUS}${value}` : `+${value}`;
}

function parseDay(isoDay: string): Date {
  const [year, month, day] = isoDay.split('-').map(Number) as [number, number, number];
  return new Date(year, month - 1, day);
}

export function shortDate(isoDay: string, language: string): string {
  return new Intl.DateTimeFormat(localeFor(language), { day: 'numeric', month: 'short' })
    .format(parseDay(isoDay))
    .replace('.', '');
}

export type DayKind = 'today' | 'yesterday' | 'other';

export function dayKind(isoDay: string, today: Date): DayKind {
  if (isoDay === isoDate(today)) {
    return 'today';
  }
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  return isoDay === isoDate(yesterday) ? 'yesterday' : 'other';
}

export interface DayGroup<T> {
  readonly day: string;
  readonly items: readonly T[];
}

export function groupByDay<T extends { date: string }>(items: readonly T[]): DayGroup<T>[] {
  const groups: { day: string; items: T[] }[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last?.day === item.date) {
      last.items.push(item);
    } else {
      groups.push({ day: item.date, items: [item] });
    }
  }
  return groups;
}
