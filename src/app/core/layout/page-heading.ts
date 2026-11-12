import { DestroyRef, Injectable, type Signal, computed, inject, signal } from '@angular/core';

export interface HeadingText {
  readonly title: string;
  readonly subtitle: string | null;
}

@Injectable({ providedIn: 'root' })
export class PageHeading {
  private readonly source = signal<Signal<HeadingText | null> | null>(null);

  readonly value = computed(() => this.source()?.() ?? null);

  use(heading: Signal<HeadingText | null>): void {
    this.source.set(heading);
    inject(DestroyRef).onDestroy(() => {
      if (this.source() === heading) {
        this.source.set(null);
      }
    });
  }
}
