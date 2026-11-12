export type Greeting = 'morning' | 'afternoon' | 'evening';
export type MonthState = 'current' | 'past' | 'future';
export type SpendRange = 'month' | 'week';

export interface DailyValue {
  readonly date: string;
  readonly total: number;
}

export interface SpendPoint {
  readonly date: string;
  readonly value: number;
  readonly future: boolean;
  readonly highlight: boolean;
}

export interface SpendComparison {
  readonly current: number;
  readonly previous: number;
  readonly change: number | null;
  readonly untilDay: number;
}

export interface PlannedTask {
  readonly id: string;
  readonly dueDate: string | null;
  readonly status: string;
  readonly planned: { readonly amount: number; readonly categoryId: string } | null;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function iso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysIn(month: string): number {
  const [year, index] = month.split('-').map(Number) as [number, number];
  return new Date(year, index, 0).getDate();
}

export function greetingFor(hour: number, language: string): Greeting {
  if (language === 'en') {
    return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  }
  if (hour >= 6 && hour < 14) {
    return 'morning';
  }
  return hour >= 14 && hour < 21 ? 'afternoon' : 'evening';
}

export function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? '';
}

export function monthState(month: string, today: Date): MonthState {
  const current = iso(today).slice(0, 7);
  if (month === current) {
    return 'current';
  }
  return month < current ? 'past' : 'future';
}

export function daysLeft(month: string, today: Date): number {
  return monthState(month, today) === 'current' ? daysIn(month) - today.getDate() : 0;
}

export function elapsedDays(month: string, today: Date): number {
  const state = monthState(month, today);
  if (state === 'current') {
    return today.getDate();
  }
  return state === 'past' ? daysIn(month) : 0;
}

export function spendSeries(
  daily: readonly DailyValue[],
  month: string,
  today: Date,
  range: SpendRange,
): SpendPoint[] {
  const totals = new Map(daily.map((row) => [row.date, row.total]));
  const todayIso = iso(today);
  const count = daysIn(month);
  const [year, index] = month.split('-').map(Number) as [number, number];
  let start = 1;
  let length = count;
  if (range === 'week') {
    const anchor = monthState(month, today) === 'current' ? today.getDate() : count;
    const weekday = (new Date(year, index - 1, anchor).getDay() + 6) % 7;
    start = Math.max(1, anchor - weekday);
    length = Math.min(7, count - start + 1);
  }
  return Array.from({ length }, (_, offset) => {
    const date = iso(new Date(year, index - 1, start + offset));
    return {
      date,
      value: totals.get(date) ?? 0,
      future: date > todayIso,
      highlight: date === todayIso,
    };
  });
}

export function compareSpend(
  current: readonly DailyValue[],
  previous: readonly DailyValue[],
  month: string,
  today: Date,
): SpendComparison {
  const untilDay = elapsedDays(month, today);
  const sum = (rows: readonly DailyValue[]) =>
    rows
      .filter((row) => Number(row.date.slice(8, 10)) <= untilDay)
      .reduce((total, row) => total + row.total, 0);
  const currentTotal = sum(current);
  const previousTotal = sum(previous);
  return {
    current: currentTotal,
    previous: previousTotal,
    change:
      previousTotal === 0
        ? null
        : Math.round(((currentTotal - previousTotal) / previousTotal) * 1000) / 10,
    untilDay,
  };
}

export function upcomingPayments<T extends PlannedTask>(tasks: readonly T[], limit = 3): T[] {
  return tasks
    .filter((task) => task.status !== 'completed' && task.planned !== null)
    .sort((a, b) => {
      if (a.dueDate === b.dueDate) {
        return 0;
      }
      if (a.dueDate === null) {
        return 1;
      }
      if (b.dueDate === null) {
        return -1;
      }
      return a.dueDate.localeCompare(b.dueDate);
    })
    .slice(0, limit);
}

export function plannedTotal(tasks: readonly PlannedTask[]): number {
  return tasks.reduce((sum, task) => sum + (task.planned?.amount ?? 0), 0);
}
