import { InjectionToken } from '@angular/core';

export type RealtimeTopic = 'finances' | 'organization';

export const REALTIME_TOPICS: readonly RealtimeTopic[] = ['finances', 'organization'];

export const TABLE_TOPICS: Readonly<Record<string, readonly RealtimeTopic[]>> = {
  categories: ['finances'],
  budgets: ['finances'],
  transactions: ['finances', 'organization'],
  tasks: ['organization', 'finances'],
  events: ['organization'],
};

export interface ChangeHandlers {
  change(topic: RealtimeTopic): void;
  reconnect(): void;
}

export interface ChangeFeed {
  subscribe(handlers: ChangeHandlers): Promise<() => void>;
}

export const NO_CHANGES: ChangeFeed = {
  subscribe: () => Promise.resolve(() => undefined),
};

export const CHANGE_FEED_LOADER = new InjectionToken<() => Promise<ChangeFeed>>(
  'CHANGE_FEED_LOADER',
  { providedIn: 'root', factory: () => () => Promise.resolve(NO_CHANGES) },
);

export interface RealtimeListener {
  readonly topic: RealtimeTopic;
  refresh(): void;
}

export const REALTIME_LISTENERS = new InjectionToken<readonly RealtimeListener[]>(
  'REALTIME_LISTENERS',
);

export interface DemoSync {
  publish(key: string, data: unknown): void;
  listen(key: string, apply: (data: unknown) => void): void;
}
