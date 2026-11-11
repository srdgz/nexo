import { DOCUMENT, DestroyRef, type Signal, inject, signal } from '@angular/core';

export function injectMediaQuery(query: string, fallback = false): Signal<boolean> {
  const view = inject(DOCUMENT).defaultView;
  if (!view?.matchMedia) {
    return signal(fallback).asReadonly();
  }

  const list = view.matchMedia(query);
  const matches = signal(list.matches);
  const listener = (event: MediaQueryListEvent) => matches.set(event.matches);

  list.addEventListener('change', listener);
  inject(DestroyRef).onDestroy(() => list.removeEventListener('change', listener));

  return matches.asReadonly();
}
