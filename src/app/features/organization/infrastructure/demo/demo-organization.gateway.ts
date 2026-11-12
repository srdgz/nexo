import type {
  EventRepository,
  OrganizationGateway,
  TaskRepository,
} from '../../application/organization-gateway';
import type { CalendarEvent, EventDraft } from '../../domain/calendar';
import { OrganizationError } from '../../domain/organization-error';
import type { Task, TaskDraft, TaskStatus } from '../../domain/task';
import type { OrganizationData } from './demo-organization.seed';

export const DEMO_ORGANIZATION_KEY = 'nexo.demo.organization';

export interface DemoOrganizationOptions {
  readonly storage: Storage | null;
  readonly seed: () => OrganizationData;
  readonly latency?: readonly [number, number];
  readonly newId?: () => string;
  readonly now?: () => Date;
}

class DemoOrganizationDb {
  private data: OrganizationData;
  private readonly latency: readonly [number, number];
  readonly newId: () => string;
  readonly now: () => Date;

  constructor(private readonly options: DemoOrganizationOptions) {
    this.latency = options.latency ?? [150, 300];
    this.newId = options.newId ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => new Date());
    this.data = this.read() ?? options.seed();
    this.save();
  }

  async run<T>(action: (data: OrganizationData) => T): Promise<T> {
    const [min, max] = this.latency;
    if (max > 0) {
      await new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)));
    }
    const result = action(this.data);
    this.save();
    return structuredClone(result);
  }

  private read(): OrganizationData | null {
    try {
      const raw = this.options.storage?.getItem(DEMO_ORGANIZATION_KEY);
      return raw ? (JSON.parse(raw) as OrganizationData) : null;
    } catch {
      return null;
    }
  }

  private save(): void {
    try {
      this.options.storage?.setItem(DEMO_ORGANIZATION_KEY, JSON.stringify(this.data));
    } catch {
      return;
    }
  }
}

function find<T extends { id: string }>(items: T[], id: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) {
    throw new OrganizationError('not_found');
  }
  return item;
}

function replace<T extends { id: string }>(items: T[], next: T): T {
  items.splice(
    items.findIndex((item) => item.id === next.id),
    1,
    next,
  );
  return next;
}

class DemoTasks implements TaskRepository {
  constructor(private readonly db: DemoOrganizationDb) {}

  private withStatus(task: Task, status: TaskStatus): Task {
    if (task.status === status) {
      return task;
    }
    return {
      ...task,
      status,
      completedAt: status === 'completed' ? this.db.now().toISOString() : null,
    };
  }

  list(): Promise<Task[]> {
    return this.db.run((data) => data.tasks);
  }

  get(id: string): Promise<Task> {
    return this.db.run((data) => find(data.tasks, id));
  }

  create(draft: TaskDraft): Promise<Task> {
    return this.db.run((data) => {
      const task = this.withStatus(
        {
          ...draft,
          id: this.db.newId(),
          status: 'pending',
          completedAt: null,
          createdAt: this.db.now().toISOString(),
        },
        draft.status,
      );
      data.tasks.push(task);
      return task;
    });
  }

  update(id: string, draft: TaskDraft): Promise<Task> {
    return this.db.run((data) => {
      const current = find(data.tasks, id);
      return replace(
        data.tasks,
        this.withStatus({ ...current, ...draft, status: current.status }, draft.status),
      );
    });
  }

  setStatus(id: string, status: TaskStatus): Promise<Task> {
    return this.db.run((data) =>
      replace(data.tasks, this.withStatus(find(data.tasks, id), status)),
    );
  }

  remove(id: string): Promise<void> {
    return this.db.run((data) => {
      find(data.tasks, id);
      data.tasks = data.tasks.filter((task) => task.id !== id);
      data.events = data.events.map((event) =>
        event.taskId === id ? { ...event, taskId: null } : event,
      );
    });
  }
}

class DemoEvents implements EventRepository {
  constructor(private readonly db: DemoOrganizationDb) {}

  between(from: Date, to: Date): Promise<CalendarEvent[]> {
    return this.db.run((data) =>
      data.events
        .filter(
          (event) =>
            new Date(event.startsAt).getTime() < to.getTime() &&
            new Date(event.endsAt).getTime() > from.getTime(),
        )
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    );
  }

  get(id: string): Promise<CalendarEvent> {
    return this.db.run((data) => find(data.events, id));
  }

  create(draft: EventDraft): Promise<CalendarEvent> {
    return this.db.run((data) => {
      const event: CalendarEvent = { ...draft, id: this.db.newId() };
      data.events.push(event);
      return event;
    });
  }

  update(id: string, draft: EventDraft): Promise<CalendarEvent> {
    return this.db.run((data) => {
      find(data.events, id);
      return replace(data.events, { ...draft, id });
    });
  }

  remove(id: string): Promise<void> {
    return this.db.run((data) => {
      find(data.events, id);
      data.events = data.events.filter((event) => event.id !== id);
    });
  }
}

export function createDemoOrganizationGateway(
  options: DemoOrganizationOptions,
): OrganizationGateway {
  const db = new DemoOrganizationDb(options);
  return { tasks: new DemoTasks(db), events: new DemoEvents(db) };
}
