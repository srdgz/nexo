import { InjectionToken } from '@angular/core';
import type { CalendarEvent, EventDraft } from '../domain/calendar';
import type { Task, TaskDraft, TaskStatus } from '../domain/task';

export interface TaskRepository {
  list(): Promise<Task[]>;
  get(id: string): Promise<Task>;
  create(draft: TaskDraft): Promise<Task>;
  update(id: string, draft: TaskDraft): Promise<Task>;
  setStatus(id: string, status: TaskStatus): Promise<Task>;
  remove(id: string): Promise<void>;
}

export interface EventRepository {
  between(from: Date, to: Date): Promise<CalendarEvent[]>;
  get(id: string): Promise<CalendarEvent>;
  create(draft: EventDraft): Promise<CalendarEvent>;
  update(id: string, draft: EventDraft): Promise<CalendarEvent>;
  remove(id: string): Promise<void>;
}

export interface OrganizationGateway {
  readonly tasks: TaskRepository;
  readonly events: EventRepository;
}

export const ORGANIZATION_GATEWAY_LOADER = new InjectionToken<() => Promise<OrganizationGateway>>(
  'ORGANIZATION_GATEWAY_LOADER',
);
