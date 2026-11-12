import {
  compareSpend,
  daysLeft,
  elapsedDays,
  firstName,
  greetingFor,
  monthState,
  plannedTotal,
  spendSeries,
  upcomingPayments,
} from './dashboard';

const today = new Date(2026, 10, 12, 10, 30);

describe('dashboard domain', () => {
  it.each([
    [7, 'es', 'morning'],
    [15, 'es', 'afternoon'],
    [22, 'es', 'evening'],
    [3, 'es', 'evening'],
    [9, 'en', 'morning'],
    [13, 'en', 'afternoon'],
    [19, 'en', 'evening'],
  ] as const)('greets at %s h in %s with %s', (hour, language, greeting) => {
    expect(greetingFor(hour, language)).toBe(greeting);
  });

  it('uses the first name', () => {
    expect(firstName('  Laura Martín ')).toBe('Laura');
  });

  it('knows the state of a month and the days left', () => {
    expect(monthState('2026-11', today)).toBe('current');
    expect(monthState('2026-10', today)).toBe('past');
    expect(monthState('2026-12', today)).toBe('future');
    expect(daysLeft('2026-11', today)).toBe(18);
    expect(daysLeft('2026-10', today)).toBe(0);
    expect(elapsedDays('2026-10', today)).toBe(31);
    expect(elapsedDays('2026-12', today)).toBe(0);
  });

  it('builds the month series with future days and today highlighted', () => {
    const series = spendSeries(
      [
        { date: '2026-11-01', total: 85000 },
        { date: '2026-11-12', total: 4250 },
      ],
      '2026-11',
      today,
      'month',
    );
    expect(series).toHaveLength(30);
    expect(series[0]).toEqual({
      date: '2026-11-01',
      value: 85000,
      future: false,
      highlight: false,
    });
    expect(series[11]).toEqual({ date: '2026-11-12', value: 4250, future: false, highlight: true });
    expect(series[12]!.future).toBe(true);
  });

  it('builds the current week from monday', () => {
    const week = spendSeries([], '2026-11', today, 'week');
    expect(week.map((point) => point.date)).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ]);
  });

  it('builds the current week from sunday when the user prefers it', () => {
    const week = spendSeries([], '2026-11', today, 'week', 0);
    expect(week[0]!.date).toBe('2026-11-08');
    expect(week.at(-1)!.date).toBe('2026-11-14');
  });

  it('compares spending with the previous month up to the same day', () => {
    const comparison = compareSpend(
      [
        { date: '2026-11-02', total: 9000 },
        { date: '2026-11-20', total: 99999 },
      ],
      [
        { date: '2026-10-02', total: 10000 },
        { date: '2026-10-30', total: 50000 },
      ],
      '2026-11',
      today,
    );
    expect(comparison).toEqual({ current: 9000, previous: 10000, change: -10, untilDay: 12 });
  });

  it('lists the next planned payments', () => {
    const tasks = [
      {
        id: 'a',
        dueDate: '2026-11-24',
        status: 'pending',
        planned: { amount: 6000, categoryId: 'c' },
      },
      { id: 'b', dueDate: null, status: 'pending', planned: { amount: 1000, categoryId: 'c' } },
      {
        id: 'c',
        dueDate: '2026-11-20',
        status: 'pending',
        planned: { amount: 44990, categoryId: 'c' },
      },
      {
        id: 'd',
        dueDate: '2026-11-15',
        status: 'completed',
        planned: { amount: 500, categoryId: 'c' },
      },
      { id: 'e', dueDate: '2026-11-13', status: 'pending', planned: null },
    ];
    const upcoming = upcomingPayments(tasks);
    expect(upcoming.map((task) => task.id)).toEqual(['c', 'a', 'b']);
    expect(plannedTotal(upcoming)).toBe(51990);
  });
});
