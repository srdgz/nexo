import type { CalendarEvent } from './calendar';
import { eventsToIcs, foldLine, parseIcs } from './ics';

const meeting: CalendarEvent = {
  id: 'e1',
  title: 'Reunión, equipo; Q4',
  description: 'Agenda:\nresultados',
  location: 'Sala 2',
  startsAt: '2026-11-20T09:30:00.000Z',
  endsAt: '2026-11-20T10:30:00.000Z',
  allDay: false,
  taskId: null,
};

const trip: CalendarEvent = {
  id: 'e2',
  title: 'Viaje',
  description: null,
  location: null,
  startsAt: new Date(2026, 11, 24).toISOString(),
  endsAt: new Date(2026, 11, 27).toISOString(),
  allDay: true,
  taskId: null,
};

describe('eventsToIcs', () => {
  it('writes an RFC 5545 calendar with escaped text, UTC times and all-day dates', () => {
    const ics = eventsToIcs([meeting, trip], new Date('2026-11-13T12:00:00Z'));

    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:')).toBe(true);
    expect(ics).toContain('UID:e1@nexo\r\nDTSTAMP:20261113T120000Z\r\n');
    expect(ics).toContain('DTSTART:20261120T093000Z\r\nDTEND:20261120T103000Z\r\n');
    expect(ics).toContain('SUMMARY:Reunión\\, equipo\\; Q4\r\n');
    expect(ics).toContain('DESCRIPTION:Agenda:\\nresultados\r\n');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261224\r\nDTEND;VALUE=DATE:20261227\r\n');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('folds long lines at 75 bytes without splitting characters', () => {
    const folded = foldLine(`SUMMARY:${'ñ'.repeat(60)}`);
    const encoder = new TextEncoder();

    expect(folded.split('\r\n ').every((part) => encoder.encode(part).length <= 75)).toBe(true);
    expect(folded.replace(/\r\n /g, '')).toBe(`SUMMARY:${'ñ'.repeat(60)}`);
  });
});

describe('parseIcs', () => {
  it('reads back what it exports', () => {
    const result = parseIcs(eventsToIcs([meeting, trip], new Date()));

    expect(result).toEqual({
      ok: true,
      skipped: 0,
      recurring: 0,
      drafts: [
        {
          title: meeting.title,
          description: meeting.description,
          location: meeting.location,
          startsAt: meeting.startsAt,
          endsAt: meeting.endsAt,
          allDay: false,
          taskId: null,
        },
        {
          title: 'Viaje',
          description: null,
          location: null,
          startsAt: trip.startsAt,
          endsAt: trip.endsAt,
          allDay: true,
          taskId: null,
        },
      ],
    });
  });

  it('converts times with a time zone, fills a missing end and skips cancelled events', () => {
    const result = parseIcs(
      [
        'BEGIN:VCALENDAR',
        'BEGIN:VTIMEZONE',
        'TZID:Europe/Madrid',
        'BEGIN:STANDARD',
        'DTSTART:19701025T030000',
        'END:STANDARD',
        'END:VTIMEZONE',
        'BEGIN:VEVENT',
        'DTSTART;TZID=Europe/Madrid:20260715T100000',
        'DURATION:PT1H30M',
        'SUMMARY:Dentista',
        'RRULE:FREQ=MONTHLY',
        'BEGIN:VALARM',
        'DESCRIPTION:Aviso',
        'END:VALARM',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'DTSTART;VALUE=DATE:20261231',
        'SUMMARY:Noche',
        '  vieja',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'DTSTART:20261101T100000Z',
        'SUMMARY:Anulado',
        'STATUS:CANCELLED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\n'),
    );

    expect(result.ok && result.drafts).toEqual([
      expect.objectContaining({
        title: 'Dentista',
        description: null,
        startsAt: '2026-07-15T08:00:00.000Z',
        endsAt: '2026-07-15T09:30:00.000Z',
        allDay: false,
      }),
      expect.objectContaining({
        title: 'Noche vieja',
        startsAt: new Date(2026, 11, 31).toISOString(),
        endsAt: new Date(2027, 0, 1).toISOString(),
        allDay: true,
      }),
    ]);
    expect(result.ok && [result.skipped, result.recurring]).toEqual([1, 1]);
  });

  it('rejects files without events', () => {
    expect(parseIcs('BEGIN:VCALENDAR\nEND:VCALENDAR')).toEqual({ ok: false, reason: 'empty' });
  });
});
