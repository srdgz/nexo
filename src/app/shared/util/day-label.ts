import { localeFor } from './active-language';

export function dayLabel(isoDay: string, language: string): string {
  const [year, month, day] = isoDay.split('-').map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(localeFor(language), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
    .format(new Date(year, month - 1, day))
    .replace(/\./g, '');
}
