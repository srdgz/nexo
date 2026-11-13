import { TestBed } from '@angular/core/testing';
import type { AssistantTool } from '@core/assistant/assistant';
import { provideTestFinances } from '../../../../testing/finances';
import { provideTestI18n } from '../../../../testing/i18n';
import {
  createTestOrganizationGateway,
  provideTestOrganization,
} from '../../../../testing/organization';
import { dayLabel } from '@shared/util/day-label';
import { addDays, combine, localDay } from '../domain/calendar';
import type { OrganizationGateway } from './organization-gateway';
import { organizationAssistantTools } from './organization-assistant-tools';

describe('organization assistant tools', () => {
  let gateway: OrganizationGateway;
  let tools: AssistantTool[];
  const tomorrow = addDays(localDay(new Date()), 1);

  beforeEach(() => {
    gateway = createTestOrganizationGateway();
    TestBed.configureTestingModule({
      imports: [provideTestI18n()],
      providers: [provideTestFinances(), provideTestOrganization(gateway)],
    });
    tools = TestBed.runInInjectionContext(organizationAssistantTools);
  });

  const tool = (name: string) => tools.find((item) => item.name === name)!;

  it('creates a task with a due date after describing it', async () => {
    const input = { title: 'Llamar al seguro', dueDate: tomorrow, priority: 'high' };

    expect(await tool('add_task').describe!(input)).toBe(
      `Nueva tarea: «Llamar al seguro», para el ${dayLabel(tomorrow, 'es')}`,
    );
    await tool('add_task').run(input);

    expect((await gateway.tasks.list()).find((task) => task.title === 'Llamar al seguro')).toEqual(
      expect.objectContaining({ dueDate: tomorrow, priority: 'high', status: 'pending' }),
    );
  });

  it('creates timed and all-day events', async () => {
    await tool('add_event').run({ title: 'Cena', date: tomorrow, startTime: '21:00' });
    await tool('add_event').run({ title: 'Viaje', date: tomorrow });
    const events = await gateway.events.all();

    expect(events.find((event) => event.title === 'Cena')).toEqual(
      expect.objectContaining({
        allDay: false,
        startsAt: combine(tomorrow, '21:00').toISOString(),
        endsAt: combine(tomorrow, '22:00').toISOString(),
      }),
    );
    expect(events.find((event) => event.title === 'Viaje')).toEqual(
      expect.objectContaining({
        allDay: true,
        endsAt: combine(addDays(tomorrow, 1), '00:00').toISOString(),
      }),
    );
    await expect(
      tool('add_event').describe!({ title: 'X', date: tomorrow, startTime: '25:00' }),
    ).rejects.toThrow('startTime must be HH:MM in 24-hour format.');
  });

  it('completes an open task found by its title', async () => {
    const [task] = (await gateway.tasks.list()).filter((item) => item.status !== 'completed');

    await tool('complete_task').run({ title: task!.title.toUpperCase() });

    expect((await gateway.tasks.get(task!.id)).status).toBe('completed');
    await expect(tool('complete_task').describe!({ title: 'zzz' })).rejects.toThrow(
      'No open task matches that title.',
    );
  });
});
