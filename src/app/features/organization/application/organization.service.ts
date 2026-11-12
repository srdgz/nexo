import { Injectable, inject, signal } from '@angular/core';
import { type CalendarEvent, type EventDraft, isValidRange } from '../domain/calendar';
import { OrganizationError } from '../domain/organization-error';
import { type Task, type TaskDraft, type TaskStatus, hasValidPlan } from '../domain/task';
import { ORGANIZATION_GATEWAY_LOADER, type OrganizationGateway } from './organization-gateway';

function clean(value: string | null | undefined, max: number): string | null {
  const text = (value ?? '').trim();
  return text ? text.slice(0, max) : null;
}

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly loader = inject(ORGANIZATION_GATEWAY_LOADER);
  private gatewayPromise: Promise<OrganizationGateway> | null = null;
  private readonly revision = signal(0);

  readonly version = this.revision.asReadonly();

  private gateway(): Promise<OrganizationGateway> {
    this.gatewayPromise ??= this.loader();
    return this.gatewayPromise;
  }

  private async mutate<T>(action: (gateway: OrganizationGateway) => Promise<T>): Promise<T> {
    const result = await action(await this.gateway());
    this.revision.update((value) => value + 1);
    return result;
  }

  async tasks(): Promise<Task[]> {
    return (await this.gateway()).tasks.list();
  }

  async task(id: string): Promise<Task> {
    return (await this.gateway()).tasks.get(id);
  }

  saveTask(id: string | null, draft: TaskDraft): Promise<Task> {
    const title = draft.title.trim();
    if (!title || !hasValidPlan(draft.planned)) {
      return Promise.reject(new OrganizationError('invalid'));
    }
    const clean_ = { ...draft, title, description: clean(draft.description, 2000) };
    return this.mutate((gateway) =>
      id ? gateway.tasks.update(id, clean_) : gateway.tasks.create(clean_),
    );
  }

  setTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    return this.mutate((gateway) => gateway.tasks.setStatus(id, status));
  }

  removeTask(id: string): Promise<void> {
    return this.mutate((gateway) => gateway.tasks.remove(id));
  }

  async events(from: Date, to: Date): Promise<CalendarEvent[]> {
    return (await this.gateway()).events.between(from, to);
  }

  async event(id: string): Promise<CalendarEvent> {
    return (await this.gateway()).events.get(id);
  }

  saveEvent(id: string | null, draft: EventDraft): Promise<CalendarEvent> {
    const title = draft.title.trim();
    if (!title || !isValidRange(new Date(draft.startsAt), new Date(draft.endsAt))) {
      return Promise.reject(new OrganizationError('invalid'));
    }
    const value: EventDraft = {
      ...draft,
      title,
      description: clean(draft.description, 2000),
      location: clean(draft.location, 120),
    };
    return this.mutate((gateway) =>
      id ? gateway.events.update(id, value) : gateway.events.create(value),
    );
  }

  removeEvent(id: string): Promise<void> {
    return this.mutate((gateway) => gateway.events.remove(id));
  }
}
