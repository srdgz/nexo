import type { MonthKey } from './month';

export interface PeriodSummary {
  readonly income: number;
  readonly expense: number;
}

export interface CategoryTotal {
  readonly categoryId: string;
  readonly total: number;
}

export interface MonthTotals {
  readonly month: MonthKey;
  readonly income: number;
  readonly expense: number;
}

export interface DailyTotal {
  readonly date: string;
  readonly total: number;
}

export function sumDaily(rows: readonly { date: string; amount: number }[]): DailyTotal[] {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    byDay.set(row.date, (byDay.get(row.date) ?? 0) + row.amount);
  }
  return [...byDay]
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function totalUntil(daily: readonly DailyTotal[], lastDay: number): number {
  return daily
    .filter((row) => Number(row.date.slice(8, 10)) <= lastDay)
    .reduce((sum, row) => sum + row.total, 0);
}

export function balanceOf(summary: PeriodSummary): number {
  return summary.income - summary.expense;
}

export function savingsRate(summary: PeriodSummary): number | null {
  if (summary.income <= 0) {
    return null;
  }
  return Math.round(((summary.income - summary.expense) / summary.income) * 1000) / 10;
}

export function shareOf(total: number, all: number): number {
  return all > 0 ? Math.round((total / all) * 1000) / 10 : 0;
}

export function changeRatio(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
