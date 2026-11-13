import { type CalendarEvent, type EventDraft, addDays, localDay, parseDay } from './calendar';

export const ICS_MAX_EVENTS = 1000;
const PRODUCT_ID = '-//NEXO//Life Manager//ES';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function utcStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function dateValue(isoDay: string): string {
  return isoDay.replace(/-/g, '');
}

export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function unescapeText(value: string): string {
  return value.replace(/\\([\\;,nN])/g, (_, char: string) =>
    char === 'n' || char === 'N' ? '\n' : char,
  );
}

export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (size + bytes > limit) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function eventsToIcs(events: readonly CalendarEvent[], now: Date): string {
  const stamp = utcStamp(now);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:${PRODUCT_ID}`, 'CALSCALE:GREGORIAN'];
  for (const event of events) {
    const start = new Date(event.startsAt);
    const end = new Date(event.endsAt);
    lines.push('BEGIN:VEVENT', `UID:${event.id}@nexo`, `DTSTAMP:${stamp}`);
    if (event.allDay) {
      lines.push(
        `DTSTART;VALUE=DATE:${dateValue(localDay(start))}`,
        `DTEND;VALUE=DATE:${dateValue(localDay(end))}`,
      );
    } else {
      lines.push(`DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(end)}`);
    }
    lines.push(`SUMMARY:${escapeText(event.title)}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    }
    if (event.location) {
      lines.push(`LOCATION:${escapeText(event.location)}`);
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

interface Property {
  readonly name: string;
  readonly params: Readonly<Record<string, string>>;
  readonly value: string;
}

function parseProperty(line: string): Property | null {
  const colon = line.search(/:(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  if (colon <= 0) {
    return null;
  }
  const [name = '', ...rawParams] = line.slice(0, colon).split(';');
  const params: Record<string, string> = {};
  for (const param of rawParams) {
    const [key, ...rest] = param.split('=');
    if (key) {
      params[key.toUpperCase()] = rest.join('=').replace(/^"|"$/g, '');
    }
  }
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) };
}

function zoneOffset(instant: number, timeZone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(new Date(instant));
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    const wall = Date.UTC(
      value('year'),
      value('month') - 1,
      value('day'),
      value('hour'),
      value('minute'),
      value('second'),
    );
    return wall - Math.floor(instant / 1000) * 1000;
  } catch {
    return null;
  }
}

interface Moment {
  readonly date: Date;
  readonly allDay: boolean;
}

function parseMoment(property: Property | undefined): Moment | null {
  if (!property) {
    return null;
  }
  const value = property.value.trim();
  const day = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (day || property.params['VALUE'] === 'DATE') {
    if (!day) {
      return null;
    }
    return { date: parseDay(`${day[1]}-${day[2]}-${day[3]}`), allDay: true };
  }
  const time = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);
  if (!time) {
    return null;
  }
  const [year, month, date, hours, minutes, seconds] = time.slice(1, 7).map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const utc = Date.UTC(year, month - 1, date, hours, minutes, seconds);
  const zone = property.params['TZID'];
  if (time[7] === 'Z') {
    return { date: new Date(utc), allDay: false };
  }
  const offset = zone ? zoneOffset(utc, zone) : null;
  if (!zone || offset === null) {
    return { date: new Date(year, month - 1, date, hours, minutes, seconds), allDay: false };
  }
  return { date: new Date(utc - (zoneOffset(utc - offset, zone) ?? offset)), allDay: false };
}

function durationMs(value: string | undefined): number | null {
  const match = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(
    (value ?? '').trim(),
  );
  if (!match) {
    return null;
  }
  const [, sign, weeks, days, hours, minutes, seconds] = match;
  const total =
    ((Number(weeks ?? 0) * 7 + Number(days ?? 0)) * 24 * 3600 +
      Number(hours ?? 0) * 3600 +
      Number(minutes ?? 0) * 60 +
      Number(seconds ?? 0)) *
    1000;
  return sign === '-' ? -total : total;
}

function unfold(text: string): string[] {
  return text
    .replace(new RegExp(`^${String.fromCharCode(0xfeff)}`), '')
    .replace(/\r\n|\r/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n');
}

export interface IcsImport {
  readonly drafts: readonly EventDraft[];
  readonly skipped: number;
  readonly recurring: number;
}

export type IcsResult =
  | ({ readonly ok: true } & IcsImport)
  | { readonly ok: false; readonly reason: 'empty' | 'too_many' };

function toDraft(properties: readonly Property[]): EventDraft | null {
  const get = (name: string) => properties.find((property) => property.name === name);
  const start = parseMoment(get('DTSTART'));
  const title = unescapeText(get('SUMMARY')?.value ?? '').trim();
  if (!start || !title || get('STATUS')?.value.toUpperCase() === 'CANCELLED') {
    return null;
  }
  let end = parseMoment(get('DTEND'))?.date ?? null;
  if (!end) {
    const duration = durationMs(get('DURATION')?.value);
    end =
      duration !== null && duration > 0
        ? new Date(start.date.getTime() + duration)
        : start.allDay
          ? parseDay(addDays(localDay(start.date), 1))
          : new Date(start.date.getTime() + 3600 * 1000);
  }
  if (end.getTime() <= start.date.getTime()) {
    return null;
  }
  const description = unescapeText(get('DESCRIPTION')?.value ?? '').trim();
  const location = unescapeText(get('LOCATION')?.value ?? '').trim();
  return {
    title,
    description: description || null,
    location: location || null,
    startsAt: start.date.toISOString(),
    endsAt: end.toISOString(),
    allDay: start.allDay,
    taskId: null,
  };
}

export function parseIcs(text: string): IcsResult {
  const drafts: EventDraft[] = [];
  let skipped = 0;
  let recurring = 0;
  let current: Property[] | null = null;
  let depth = 0;

  for (const line of unfold(text)) {
    const property = parseProperty(line);
    if (!property) {
      continue;
    }
    if (property.name === 'BEGIN' && property.value.toUpperCase() === 'VEVENT') {
      current = [];
      depth = 0;
    } else if (current && property.name === 'BEGIN') {
      depth += 1;
    } else if (current && property.name === 'END' && depth > 0) {
      depth -= 1;
    } else if (current && property.name === 'END' && property.value.toUpperCase() === 'VEVENT') {
      if (current.some((item) => item.name === 'RECURRENCE-ID')) {
        skipped += 1;
      } else {
        const draft = toDraft(current);
        if (draft) {
          drafts.push(draft);
          if (current.some((item) => item.name === 'RRULE')) {
            recurring += 1;
          }
        } else {
          skipped += 1;
        }
      }
      current = null;
    } else if (current && depth === 0) {
      current.push(property);
    }
  }

  if (drafts.length + skipped === 0) {
    return { ok: false, reason: 'empty' };
  }
  if (drafts.length > ICS_MAX_EVENTS) {
    return { ok: false, reason: 'too_many' };
  }
  return { ok: true, drafts, skipped, recurring };
}
