export type MonthKey = `${number}-${string}`;

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function isMonthKey(value: unknown): value is MonthKey {
  return typeof value === 'string' && MONTH_PATTERN.test(value);
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1 && date.getDate() === day;
}

export function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function monthOf(date: Date): MonthKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function monthOfDate(isoDay: string): MonthKey {
  return isoDay.slice(0, 7) as MonthKey;
}

export function toMonthKey(value: string | null | undefined, today: Date): MonthKey {
  return isMonthKey(value) ? value : monthOf(today);
}

export function addMonths(month: MonthKey, amount: number): MonthKey {
  const [year, index] = month.split('-').map(Number) as [number, number];
  return monthOf(new Date(year, index - 1 + amount, 1));
}

export function monthStart(month: MonthKey): string {
  return `${month}-01`;
}

export function monthRange(month: MonthKey): { from: string; to: string } {
  const [year, index] = month.split('-').map(Number) as [number, number];
  return { from: monthStart(month), to: isoDate(new Date(year, index, 0)) };
}

export function monthDate(month: MonthKey): Date {
  const [year, index] = month.split('-').map(Number) as [number, number];
  return new Date(year, index - 1, 1);
}
