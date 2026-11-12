import {
  addDays,
  combine,
  compareEvents,
  eventDays,
  isValidRange,
  monthGrid,
  occursOn,
} from './calendar';
import {
  type Task,
  compareTasks,
  groupTasks,
  hasValidPlan,
  isOverdue,
  matchesFilter,
  nextStatus,
} from './task';

const today = '2026-11-12';
const weekEnd = addDays(today, 7);

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    title: partial.id,
    description: null,
    status: 'pending',
    priority: 'medium',
    dueDate: null,
    completedAt: null,
    createdAt: '2026-11-01T10:00:00.000Z',
    planned: null,
    ...partial,
  };
}

describe('tasks', () => {
  const tasks = [
    task({ id: 'late', dueDate: '2026-11-10', priority: 'low' }),
    task({ id: 'today-high', dueDate: today, priority: 'high' }),
    task({ id: 'today-low', dueDate: today, priority: 'low' }),
    task({ id: 'soon', dueDate: '2026-11-15', status: 'in_progress' }),
    task({ id: 'later', dueDate: '2026-12-01' }),
    task({ id: 'undated' }),
    task({
      id: 'done',
      dueDate: '2026-11-01',
      status: 'completed',
      completedAt: '2026-11-01T18:00:00Z',
    }),
  ];

  it('knows which tasks are overdue', () => {
    expect(isOverdue(tasks[0]!, today)).toBe(true);
    expect(isOverdue(tasks[1]!, today)).toBe(false);
    expect(isOverdue(tasks[6]!, today)).toBe(false);
  });

  it('filters by status and priority', () => {
    const ids = (
      filter: Parameters<typeof matchesFilter>[1],
      priorities: Task['priority'][] = [],
    ) => tasks.filter((item) => matchesFilter(item, filter, priorities)).map((item) => item.id);

    expect(ids('open')).not.toContain('done');
    expect(ids('in_progress')).toEqual(['soon']);
    expect(ids('completed')).toEqual(['done']);
    expect(ids('all')).toHaveLength(7);
    expect(ids('open', ['high'])).toEqual(['today-high']);
  });

  it('sorts by due date with undated last, then by priority', () => {
    const sorted = [...tasks].sort(compareTasks('due')).map((item) => item.id);
    expect(sorted).toEqual(['done', 'late', 'today-high', 'today-low', 'soon', 'later', 'undated']);
    expect([...tasks].sort(compareTasks('priority'))[0]!.id).toBe('today-high');
  });

  it('groups by when they are due', () => {
    const groups = groupTasks([...tasks].sort(compareTasks('due')), today, weekEnd);
    expect(groups.map((group) => [group.key, group.tasks.map((item) => item.id)])).toEqual([
      ['overdue', ['late']],
      ['today', ['today-high', 'today-low']],
      ['week', ['soon']],
      ['later', ['later']],
      ['undated', ['undated']],
      ['done', ['done']],
    ]);
  });

  it('validates planned payments and toggles completion', () => {
    expect(hasValidPlan(null)).toBe(true);
    expect(hasValidPlan({ amount: 44990, categoryId: 'c1' })).toBe(true);
    expect(hasValidPlan({ amount: 0, categoryId: 'c1' })).toBe(false);
    expect(hasValidPlan({ amount: 100, categoryId: '' })).toBe(false);
    expect(nextStatus({ status: 'in_progress' })).toBe('completed');
    expect(nextStatus({ status: 'completed' })).toBe('pending');
  });
});

describe('calendar', () => {
  it('builds a six week grid starting on monday or sunday', () => {
    const monday = monthGrid('2026-11', 1);
    expect(monday).toHaveLength(42);
    expect(monday[0]).toEqual({ date: '2026-10-26', day: 26, inMonth: false });
    expect(monday.find((day) => day.date === '2026-11-01')?.inMonth).toBe(true);

    expect(monthGrid('2026-11', 0)[0]!.date).toBe('2026-11-01');
  });

  it('places events on every day they cover', () => {
    const timed = {
      startsAt: combine('2026-11-13', '09:30').toISOString(),
      endsAt: combine('2026-11-13', '10:30').toISOString(),
      allDay: false,
    };
    const allDay = {
      startsAt: combine('2026-11-18', '00:00').toISOString(),
      endsAt: combine('2026-11-20', '00:00').toISOString(),
      allDay: true,
    };
    expect(eventDays(timed)).toEqual(['2026-11-13']);
    expect(eventDays(allDay)).toEqual(['2026-11-18', '2026-11-19']);
    expect(occursOn(allDay, '2026-11-20')).toBe(false);
  });

  it('puts all-day events first and checks ranges', () => {
    const base = { id: 'a', title: 'A', description: null, location: null, taskId: null };
    const morning = {
      ...base,
      startsAt: '2026-11-13T08:00:00Z',
      endsAt: '2026-11-13T09:00:00Z',
      allDay: false,
    };
    const allDay = {
      ...base,
      id: 'b',
      startsAt: '2026-11-13T00:00:00Z',
      endsAt: '2026-11-14T00:00:00Z',
      allDay: true,
    };
    expect([morning, allDay].sort(compareEvents)[0]!.id).toBe('b');
    expect(isValidRange(combine(today, '10:00'), combine(today, '09:00'))).toBe(false);
    expect(isValidRange(combine(today, '09:00'), combine(today, '10:00'))).toBe(true);
  });
});
