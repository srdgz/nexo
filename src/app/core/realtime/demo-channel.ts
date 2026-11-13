import { DOCUMENT, Injectable, inject } from '@angular/core';
import { RELOAD, clearDemoData } from '../app-mode/app-mode';
import type { ChangeFeed, ChangeHandlers, DemoSync, RealtimeTopic } from './realtime';

export const DEMO_CHANNEL_NAME = 'nexo-demo';

export const DEMO_SYNCED_KEYS: Readonly<Record<string, RealtimeTopic>> = {
  'nexo.demo.finances': 'finances',
  'nexo.demo.organization': 'organization',
};

type DemoMessage =
  | { readonly type: 'hello'; readonly from: string }
  | {
      readonly type: 'snapshot';
      readonly key: string;
      readonly data: unknown;
      readonly to?: string;
    }
  | { readonly type: 'reset' };

@Injectable({ providedIn: 'root' })
export class DemoChannel implements DemoSync, ChangeFeed {
  private readonly document = inject(DOCUMENT);
  private readonly reload = inject(RELOAD);
  private readonly id = crypto.randomUUID();
  private readonly appliers = new Map<string, (data: unknown) => void>();
  private readonly topicListeners = new Set<(topic: RealtimeTopic) => void>();
  private readonly adopted = new Set<string>();
  private channel: BroadcastChannel | null = null;
  private resetting = false;

  connect(): void {
    const view = this.document.defaultView;
    if (this.channel || !view || typeof view.BroadcastChannel === 'undefined') {
      return;
    }
    this.channel = new view.BroadcastChannel(DEMO_CHANNEL_NAME);
    this.channel.onmessage = (event: MessageEvent<DemoMessage>) => this.receive(event.data);
    this.post({ type: 'hello', from: this.id });
  }

  publish(key: string, data: unknown): void {
    this.connect();
    this.post({ type: 'snapshot', key, data });
  }

  listen(key: string, apply: (data: unknown) => void): void {
    this.connect();
    this.appliers.set(key, apply);
  }

  subscribe(handlers: ChangeHandlers): Promise<() => void> {
    this.connect();
    const listener = (topic: RealtimeTopic) => handlers.change(topic);
    this.topicListeners.add(listener);
    return Promise.resolve(() => this.topicListeners.delete(listener));
  }

  reset(): void {
    this.resetting = true;
    this.connect();
    this.post({ type: 'reset' });
  }

  private receive(message: DemoMessage): void {
    if (this.resetting) {
      return;
    }
    if (message.type === 'hello') {
      this.answer(message.from);
    } else if (message.type === 'snapshot') {
      this.apply(message.key, message.data, message.to);
    } else {
      this.resetting = true;
      clearDemoData(this.document);
      const location = this.document.location;
      this.reload(`${location.pathname}${location.search}`);
    }
  }

  private answer(to: string): void {
    for (const key of Object.keys(DEMO_SYNCED_KEYS)) {
      const raw = this.storage()?.getItem(key);
      if (raw) {
        try {
          this.post({ type: 'snapshot', key, data: JSON.parse(raw) as unknown, to });
        } catch {
          continue;
        }
      }
    }
  }

  private apply(key: string, data: unknown, to: string | undefined): void {
    const topic = DEMO_SYNCED_KEYS[key];
    if (!topic || (to !== undefined && (to !== this.id || this.adopted.has(key)))) {
      return;
    }
    if (to !== undefined) {
      this.adopted.add(key);
    }
    try {
      this.storage()?.setItem(key, JSON.stringify(data));
    } catch {
      return;
    }
    this.appliers.get(key)?.(data);
    for (const listener of this.topicListeners) {
      listener(topic);
    }
  }

  private post(message: DemoMessage): void {
    this.channel?.postMessage(message);
  }

  private storage(): Storage | null {
    try {
      return this.document.defaultView?.sessionStorage ?? null;
    } catch {
      return null;
    }
  }
}
