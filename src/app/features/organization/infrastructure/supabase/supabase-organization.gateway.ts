import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  EventRepository,
  OrganizationGateway,
  TaskRepository,
} from '../../application/organization-gateway';
import type { CalendarEvent, EventDraft } from '../../domain/calendar';
import { OrganizationError } from '../../domain/organization-error';
import type { Task, TaskDraft, TaskPriority, TaskStatus } from '../../domain/task';

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  planned_amount: number | string | null;
  planned_category_id: string | null;
}

export interface EventRow {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  task_id: string | null;
}

const TASK_COLUMNS =
  'id, title, description, status, priority, due_date, completed_at, created_at, planned_amount, planned_category_id';
const EVENT_COLUMNS = 'id, title, description, location, starts_at, ends_at, all_day, task_id';

export function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    planned:
      row.planned_amount !== null && row.planned_category_id
        ? {
            amount: Math.round(Number(row.planned_amount) * 100),
            categoryId: row.planned_category_id,
          }
        : null,
  };
}

export function mapEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: row.all_day,
    taskId: row.task_id,
  };
}

export function taskRow(draft: TaskDraft) {
  return {
    title: draft.title,
    description: draft.description,
    priority: draft.priority,
    due_date: draft.dueDate,
    planned_amount: draft.planned ? (draft.planned.amount / 100).toFixed(2) : null,
    planned_category_id: draft.planned?.categoryId ?? null,
  };
}

export function statusPatch(status: TaskStatus, now = new Date()) {
  return { status, completed_at: status === 'completed' ? now.toISOString() : null };
}

export function mapOrganizationError(error: unknown): OrganizationError {
  if (error instanceof OrganizationError) {
    return error;
  }
  const code = (error as { code?: string } | null)?.code;
  if (code === 'PGRST116') {
    return new OrganizationError('not_found');
  }
  if (code === '23514' || code === '23503' || code === '22P02') {
    return new OrganizationError('invalid');
  }
  const message = (error as { message?: string } | null)?.message ?? '';
  if (error instanceof TypeError || /fetch|network/i.test(message)) {
    return new OrganizationError('network');
  }
  return new OrganizationError('unknown');
}

interface Result<T> {
  data: T | null;
  error: unknown;
}

async function run<T>(query: PromiseLike<Result<T>>): Promise<T> {
  let result: Result<T>;
  try {
    result = await query;
  } catch (error) {
    throw mapOrganizationError(error);
  }
  if (result.error) {
    throw mapOrganizationError(result.error);
  }
  return result.data as T;
}

class SupabaseTasks implements TaskRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<Task[]> {
    const rows = await run<TaskRow[]>(this.client.from('tasks').select(TASK_COLUMNS));
    return rows.map(mapTask);
  }

  async get(id: string): Promise<Task> {
    return mapTask(
      await run<TaskRow>(this.client.from('tasks').select(TASK_COLUMNS).eq('id', id).single()),
    );
  }

  async create(draft: TaskDraft): Promise<Task> {
    return mapTask(
      await run<TaskRow>(
        this.client
          .from('tasks')
          .insert({ ...taskRow(draft), ...statusPatch(draft.status) })
          .select(TASK_COLUMNS)
          .single(),
      ),
    );
  }

  async update(id: string, draft: TaskDraft): Promise<Task> {
    const current = await this.get(id);
    const patch =
      current.status === draft.status
        ? taskRow(draft)
        : { ...taskRow(draft), ...statusPatch(draft.status) };
    return mapTask(
      await run<TaskRow>(
        this.client.from('tasks').update(patch).eq('id', id).select(TASK_COLUMNS).single(),
      ),
    );
  }

  async setStatus(id: string, status: TaskStatus): Promise<Task> {
    return mapTask(
      await run<TaskRow>(
        this.client
          .from('tasks')
          .update(statusPatch(status))
          .eq('id', id)
          .select(TASK_COLUMNS)
          .single(),
      ),
    );
  }

  async remove(id: string): Promise<void> {
    await run(this.client.from('tasks').delete().eq('id', id));
  }
}

function eventRow(draft: EventDraft) {
  return {
    title: draft.title,
    description: draft.description,
    location: draft.location,
    starts_at: draft.startsAt,
    ends_at: draft.endsAt,
    all_day: draft.allDay,
    task_id: draft.taskId,
  };
}

class SupabaseEvents implements EventRepository {
  constructor(private readonly client: SupabaseClient) {}

  async between(from: Date, to: Date): Promise<CalendarEvent[]> {
    const rows = await run<EventRow[]>(
      this.client
        .from('events')
        .select(EVENT_COLUMNS)
        .lt('starts_at', to.toISOString())
        .gt('ends_at', from.toISOString())
        .order('starts_at'),
    );
    return rows.map(mapEvent);
  }

  async all(): Promise<CalendarEvent[]> {
    const rows = await run<EventRow[]>(
      this.client.from('events').select(EVENT_COLUMNS).order('starts_at'),
    );
    return rows.map(mapEvent);
  }

  async createMany(drafts: readonly EventDraft[]): Promise<number> {
    if (drafts.length === 0) {
      return 0;
    }
    await run(this.client.from('events').insert(drafts.map(eventRow)));
    return drafts.length;
  }

  async get(id: string): Promise<CalendarEvent> {
    return mapEvent(
      await run<EventRow>(this.client.from('events').select(EVENT_COLUMNS).eq('id', id).single()),
    );
  }

  async create(draft: EventDraft): Promise<CalendarEvent> {
    return mapEvent(
      await run<EventRow>(
        this.client.from('events').insert(eventRow(draft)).select(EVENT_COLUMNS).single(),
      ),
    );
  }

  async update(id: string, draft: EventDraft): Promise<CalendarEvent> {
    return mapEvent(
      await run<EventRow>(
        this.client
          .from('events')
          .update(eventRow(draft))
          .eq('id', id)
          .select(EVENT_COLUMNS)
          .single(),
      ),
    );
  }

  async remove(id: string): Promise<void> {
    await run(this.client.from('events').delete().eq('id', id));
  }
}

export function createSupabaseOrganizationGateway(client: SupabaseClient): OrganizationGateway {
  return { tasks: new SupabaseTasks(client), events: new SupabaseEvents(client) };
}
