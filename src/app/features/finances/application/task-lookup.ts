import { InjectionToken } from '@angular/core';

export interface TaskOption {
  readonly id: string;
  readonly title: string;
  readonly open: boolean;
}

export interface TaskLookup {
  options(): Promise<TaskOption[]>;
}

export const TASK_LOOKUP = new InjectionToken<TaskLookup>('TASK_LOOKUP', {
  providedIn: 'root',
  factory: () => ({ options: () => Promise.resolve([]) }),
});
