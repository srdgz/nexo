import { Injectable, inject } from '@angular/core';
import {
  CHANGE_FEED_LOADER,
  REALTIME_LISTENERS,
  REALTIME_TOPICS,
  type RealtimeTopic,
} from './realtime';

export const REALTIME_DEBOUNCE_MS = 250;

@Injectable({ providedIn: 'root' })
export class RealtimeSync {
  private readonly loader = inject(CHANGE_FEED_LOADER);
  private readonly listeners = inject(REALTIME_LISTENERS, { optional: true }) ?? [];
  private readonly pending = new Set<RealtimeTopic>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  private active = false;
  private unsubscribe: (() => void) | null = null;

  async start(): Promise<void> {
    if (this.active) {
      return;
    }
    this.active = true;
    const generation = ++this.generation;
    try {
      const feed = await this.loader();
      const stop = await feed.subscribe({
        change: (topic) => this.queue([topic]),
        reconnect: () => this.queue(REALTIME_TOPICS),
      });
      if (generation === this.generation) {
        this.unsubscribe = stop;
      } else {
        stop();
      }
    } catch {
      if (generation === this.generation) {
        this.active = false;
      }
    }
  }

  stop(): void {
    this.generation += 1;
    this.active = false;
    clearTimeout(this.timer);
    this.pending.clear();
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private queue(topics: readonly RealtimeTopic[]): void {
    for (const topic of topics) {
      this.pending.add(topic);
    }
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), REALTIME_DEBOUNCE_MS);
  }

  private flush(): void {
    for (const listener of this.listeners) {
      if (this.pending.has(listener.topic)) {
        listener.refresh();
      }
    }
    this.pending.clear();
  }
}
