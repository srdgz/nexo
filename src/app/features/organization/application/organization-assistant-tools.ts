import { inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import {
  type AssistantTool,
  type ToolInput,
  ToolInputError,
  text,
} from '@core/assistant/assistant';
import {
  EVENT_LOCATION_MAX,
  EVENT_TITLE_MAX,
  type EventDraft,
  addDays,
  combine,
  localDay,
  localTime,
  parseDay,
} from '../domain/calendar';
import {
  TASK_TITLE_MAX,
  type Task,
  type TaskDraft,
  type TaskPriority,
  isOpen,
} from '../domain/task';
import { OrganizationService } from './organization.service';
import { dayLabel } from '@shared/util/day-label';

const LIST_LIMIT = 50;
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function day(input: ToolInput, key: string): string | null {
  const value = text(input, key);
  if (value === null) {
    return null;
  }
  if (!DAY.test(value) || localDay(parseDay(value)) !== value) {
    throw new ToolInputError(`${key} must be YYYY-MM-DD.`);
  }
  return value;
}

function time(input: ToolInput, key: string): string | null {
  const value = text(input, key);
  if (value === null) {
    return null;
  }
  if (!TIME.test(value)) {
    throw new ToolInputError(`${key} must be HH:MM in 24-hour format.`);
  }
  return value;
}

function priority(input: ToolInput): TaskPriority {
  const value = input['priority'];
  return value === 'low' || value === 'high' ? value : 'medium';
}

function title(input: ToolInput, max: number): string {
  const value = text(input, 'title');
  if (!value) {
    throw new ToolInputError('title is required.');
  }
  return value.slice(0, max);
}

export function organizationAssistantTools(): AssistantTool[] {
  const organization = inject(OrganizationService);
  const transloco = inject(TranslocoService);

  function taskDraft(input: ToolInput): TaskDraft {
    return {
      title: title(input, TASK_TITLE_MAX),
      description: text(input, 'notes'),
      status: 'pending',
      priority: priority(input),
      dueDate: day(input, 'dueDate'),
      planned: null,
    };
  }

  async function openTask(input: ToolInput): Promise<Task> {
    const wanted = title(input, TASK_TITLE_MAX).toLocaleLowerCase();
    const open = (await organization.tasks()).filter(isOpen);
    const exact = open.filter((task) => task.title.toLocaleLowerCase() === wanted);
    const partial = open.filter((task) => task.title.toLocaleLowerCase().includes(wanted));
    const matches = exact.length ? exact : partial;
    if (matches.length !== 1) {
      throw new ToolInputError(
        matches.length
          ? `Several open tasks match: ${matches.map((task) => task.title).join(', ')}. Ask which one.`
          : 'No open task matches that title. Call list_tasks to see them.',
      );
    }
    return matches[0] as Task;
  }

  function eventDraft(input: ToolInput): EventDraft {
    const date = day(input, 'date');
    if (!date) {
      throw new ToolInputError('date is required.');
    }
    const start = time(input, 'startTime');
    const end = time(input, 'endTime');
    const location = text(input, 'location');
    if (!start) {
      return {
        title: title(input, EVENT_TITLE_MAX),
        description: null,
        location: location?.slice(0, EVENT_LOCATION_MAX) ?? null,
        startsAt: combine(date, '00:00').toISOString(),
        endsAt: combine(addDays(date, 1), '00:00').toISOString(),
        allDay: true,
        taskId: null,
      };
    }
    const startsAt = combine(date, start);
    const endsAt = end ? combine(date, end) : new Date(startsAt.getTime() + 3600 * 1000);
    if (endsAt <= startsAt) {
      throw new ToolInputError('endTime must be after startTime.');
    }
    return {
      title: title(input, EVENT_TITLE_MAX),
      description: null,
      location: location?.slice(0, EVENT_LOCATION_MAX) ?? null,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      allDay: false,
      taskId: null,
    };
  }

  function whenLabel(event: EventDraft): string {
    const start = new Date(event.startsAt);
    const label = dayLabel(localDay(start), transloco.getActiveLang());
    return event.allDay ? label : `${label}, ${localTime(start)}`;
  }

  function when(event: EventDraft): string {
    const start = new Date(event.startsAt);
    return event.allDay ? localDay(start) : `${localDay(start)} ${localTime(start)}`;
  }

  return [
    {
      name: 'list_tasks',
      description: `Lists up to ${LIST_LIMIT} of the user’s tasks.`,
      parameters: {
        type: 'object',
        properties: { status: { type: 'string', enum: ['open', 'completed', 'all'] } },
      },
      writes: false,
      run: async (input) => {
        const status = input['status'];
        const tasks = (await organization.tasks()).filter((task) =>
          status === 'all' ? true : status === 'completed' ? !isOpen(task) : isOpen(task),
        );
        return {
          total: tasks.length,
          items: tasks.slice(0, LIST_LIMIT).map((task) => ({
            title: task.title,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
          })),
        };
      },
    },
    {
      name: 'add_task',
      description: 'Creates a task, optionally with a due date and a priority.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          dueDate: { type: 'string', description: 'YYYY-MM-DD' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          notes: { type: 'string' },
        },
        required: ['title'],
      },
      writes: true,
      describe: async (input) => {
        const draft = taskDraft(input);
        return transloco.translate(
          draft.dueDate ? 'assistant.actions.addTaskDue' : 'assistant.actions.addTask',
          {
            title: draft.title,
            date: draft.dueDate ? dayLabel(draft.dueDate, transloco.getActiveLang()) : null,
          },
        );
      },
      run: async (input) => {
        const saved = await organization.saveTask(null, taskDraft(input));
        return { title: saved.title, dueDate: saved.dueDate };
      },
    },
    {
      name: 'complete_task',
      description: 'Marks one of the user’s open tasks as done, found by its title.',
      parameters: {
        type: 'object',
        properties: { title: { type: 'string' } },
        required: ['title'],
      },
      writes: true,
      describe: async (input) =>
        transloco.translate('assistant.actions.completeTask', {
          title: (await openTask(input)).title,
        }),
      run: async (input) => {
        const task = await openTask(input);
        await organization.setTaskStatus(task.id, 'completed');
        return { title: task.title, status: 'completed' };
      },
    },
    {
      name: 'list_events',
      description: 'Lists calendar events between two dates (both included).',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'YYYY-MM-DD. Defaults to today.' },
          to: { type: 'string', description: 'YYYY-MM-DD. Defaults to 7 days after from.' },
        },
      },
      writes: false,
      run: async (input) => {
        const from = day(input, 'from') ?? localDay(new Date());
        const to = day(input, 'to') ?? addDays(from, 7);
        const events = await organization.events(parseDay(from), parseDay(addDays(to, 1)));
        return events.slice(0, LIST_LIMIT).map((event) => ({
          title: event.title,
          start: when(event),
          end: event.allDay
            ? localDay(new Date(new Date(event.endsAt).getTime() - 1))
            : localTime(new Date(event.endsAt)),
          allDay: event.allDay,
          location: event.location,
        }));
      },
    },
    {
      name: 'add_event',
      description:
        'Creates a calendar event. Without startTime it is an all-day event; without endTime it lasts one hour.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          date: { type: 'string', description: 'YYYY-MM-DD' },
          startTime: { type: 'string', description: 'HH:MM, 24-hour' },
          endTime: { type: 'string', description: 'HH:MM, 24-hour' },
          location: { type: 'string' },
        },
        required: ['title', 'date'],
      },
      writes: true,
      describe: async (input) => {
        const draft = eventDraft(input);
        return transloco.translate('assistant.actions.addEvent', {
          title: draft.title,
          date: whenLabel(draft),
        });
      },
      run: async (input) => {
        const saved = await organization.saveEvent(null, eventDraft(input));
        return { title: saved.title, start: when(saved) };
      },
    },
  ];
}
