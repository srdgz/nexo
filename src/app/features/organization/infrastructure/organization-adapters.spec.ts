import { createTestOrganizationGateway } from '../../../../testing/organization';
import { localDay } from '../domain/calendar';
import { createOrganizationSeed } from './demo/demo-organization.seed';
import {
  mapOrganizationError,
  mapTask,
  statusPatch,
  taskRow,
} from './supabase/supabase-organization.gateway';

describe('demo organization seed', () => {
  it('always has tasks for today, an overdue one and upcoming events', () => {
    const today = new Date(2027, 1, 28);
    const seed = createOrganizationSeed(today, 'es');
    const day = localDay(today);

    expect(seed.tasks.filter((task) => task.dueDate === day).length).toBeGreaterThan(0);
    expect(
      seed.tasks.some(
        (task) => task.dueDate !== null && task.dueDate < day && task.status !== 'completed',
      ),
    ).toBe(true);
    expect(seed.tasks.find((task) => task.id === 'demo-task-insurance')?.planned).toEqual({
      amount: 44990,
      categoryId: 'demo-category-insurance',
    });
    expect(
      seed.events.filter((event) => event.startsAt > today.toISOString()).length,
    ).toBeGreaterThan(3);
  });
});

describe('demo organization gateway', () => {
  it('sets and clears completion time with the status', async () => {
    const gateway = createTestOrganizationGateway();

    const done = await gateway.tasks.setStatus('demo-task-plumber', 'completed');
    expect(done.completedAt).not.toBeNull();

    const reopened = await gateway.tasks.setStatus('demo-task-plumber', 'pending');
    expect(reopened.completedAt).toBeNull();
  });

  it('unlinks events when their task is deleted', async () => {
    const gateway = createTestOrganizationGateway();

    await gateway.tasks.remove('demo-task-mechanic');

    expect((await gateway.events.get('demo-event-mot')).taskId).toBeNull();
    await expect(gateway.tasks.get('demo-task-mechanic')).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('returns events that overlap a range', async () => {
    const gateway = createTestOrganizationGateway();
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

    const events = await gateway.events.between(from, to);

    expect(events.map((event) => event.id)).toEqual(['demo-event-dentist']);
  });
});

describe('supabase organization mapping', () => {
  it('maps rows with planned payments in cents', () => {
    const task = mapTask({
      id: 't1',
      title: 'Pagar el seguro',
      description: null,
      status: 'pending',
      priority: 'high',
      due_date: '2026-11-20',
      completed_at: null,
      created_at: '2026-11-01T10:00:00Z',
      planned_amount: '449.90',
      planned_category_id: 'c1',
    });
    expect(task.planned).toEqual({ amount: 44990, categoryId: 'c1' });
    expect(taskRow(task).planned_amount).toBe('449.90');
  });

  it('keeps completed_at in line with the status', () => {
    const now = new Date('2026-11-12T10:00:00Z');
    expect(statusPatch('completed', now)).toEqual({
      status: 'completed',
      completed_at: now.toISOString(),
    });
    expect(statusPatch('in_progress', now)).toEqual({ status: 'in_progress', completed_at: null });
  });

  it('maps database errors', () => {
    expect(mapOrganizationError({ code: 'PGRST116' }).code).toBe('not_found');
    expect(mapOrganizationError({ code: '23514' }).code).toBe('invalid');
    expect(mapOrganizationError(new TypeError('Failed to fetch')).code).toBe('network');
  });
});
