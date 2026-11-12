export const EVENT_TITLE_MAX = 120;
export const EVENT_LOCATION_MAX = 120;

export interface CalendarEvent {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly location: string | null;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly allDay: boolean;
  readonly taskId: string | null;
}

export type EventDraft = Omit<CalendarEvent, 'id'>;

export interface CalendarDay {
  readonly date: string;
  readonly day: number;
  readonly inMonth: boolean;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function localDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function localTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseDay(isoDay: string): Date {
  const [year, month, day] = isoDay.split('-').map(Number) as [number, number, number];
  return new Date(year, month - 1, day);
}

export function addDays(isoDay: string, amount: number): string {
  const date = parseDay(isoDay);
  date.setDate(date.getDate() + amount);
  return localDay(date);
}

export function combine(isoDay: string, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number) as [number, number];
  const date = parseDay(isoDay);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function monthGrid(month: string, weekStartsOn: 0 | 1): CalendarDay[] {
  const [year, index] = month.split('-').map(Number) as [number, number];
  const first = new Date(year, index - 1, 1);
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  const start = new Date(year, index - 1, 1 - offset);
  return Array.from({ length: 42 }, (_, position) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + position);
    return { date: localDay(date), day: date.getDate(), inMonth: date.getMonth() === index - 1 };
  });
}

export function eventDays(event: Pick<CalendarEvent, 'startsAt' | 'endsAt' | 'allDay'>): string[] {
  const start = new Date(event.startsAt);
  const end = new Date(new Date(event.endsAt).getTime() - (event.allDay ? 1 : 0));
  const days: string[] = [];
  for (let day = localDay(start); day <= localDay(end); day = addDays(day, 1)) {
    days.push(day);
    if (days.length > 62) {
      break;
    }
  }
  return days;
}

export function occursOn(
  event: Pick<CalendarEvent, 'startsAt' | 'endsAt' | 'allDay'>,
  isoDay: string,
): boolean {
  return eventDays(event).includes(isoDay);
}

export function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
  if (a.allDay !== b.allDay) {
    return a.allDay ? -1 : 1;
  }
  return a.startsAt.localeCompare(b.startsAt) || a.title.localeCompare(b.title);
}

export function isValidRange(startsAt: Date, endsAt: Date): boolean {
  return endsAt.getTime() > startsAt.getTime();
}
