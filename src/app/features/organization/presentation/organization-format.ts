import { localeFor } from '@shared/util/active-language';
import { addDays, parseDay } from '../domain/calendar';

export type DueKind = 'today' | 'tomorrow' | 'yesterday' | 'overdue' | 'date' | 'none';

export function dueKind(dueDate: string | null, today: string, open: boolean): DueKind {
  if (dueDate === null) {
    return 'none';
  }
  if (dueDate === today) {
    return 'today';
  }
  if (dueDate === addDays(today, 1)) {
    return 'tomorrow';
  }
  if (dueDate === addDays(today, -1)) {
    return open ? 'overdue' : 'yesterday';
  }
  return open && dueDate < today ? 'overdue' : 'date';
}

export function dayMonth(isoDay: string, language: string): string {
  return new Intl.DateTimeFormat(localeFor(language), { day: 'numeric', month: 'short' })
    .format(parseDay(isoDay))
    .replace('.', '');
}

export function longDay(isoDay: string, language: string): string {
  const text = new Intl.DateTimeFormat(localeFor(language), {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
    .format(parseDay(isoDay))
    .replace('.', '');
  return `${text.charAt(0).toLocaleUpperCase()}${text.slice(1)}`;
}

export function timeRange(startsAt: string, endsAt: string, language: string): string {
  const format = new Intl.DateTimeFormat(localeFor(language), {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${format.format(new Date(startsAt))} – ${format.format(new Date(endsAt))}`;
}
