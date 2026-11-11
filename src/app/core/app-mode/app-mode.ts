import { DOCUMENT, InjectionToken, inject } from '@angular/core';

export type AppMode = 'real' | 'demo';

const MODE_KEY = 'nexo.mode';
export const DEMO_STORAGE_PREFIX = 'nexo.demo.';

function storage(document: Document): Storage | null {
  try {
    return document.defaultView?.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export function readAppMode(document: Document): AppMode {
  return storage(document)?.getItem(MODE_KEY) === 'demo' ? 'demo' : 'real';
}

export function enterDemo(document: Document): void {
  storage(document)?.setItem(MODE_KEY, 'demo');
}

export function clearDemoData(document: Document): void {
  const store = storage(document);
  if (!store) {
    return;
  }
  const keys = Array.from({ length: store.length }, (_, index) => store.key(index));
  for (const key of keys) {
    if (key?.startsWith(DEMO_STORAGE_PREFIX)) {
      store.removeItem(key);
    }
  }
}

export function leaveDemo(document: Document): void {
  clearDemoData(document);
  storage(document)?.removeItem(MODE_KEY);
}

export const APP_MODE = new InjectionToken<AppMode>('APP_MODE', {
  providedIn: 'root',
  factory: () => readAppMode(inject(DOCUMENT)),
});

export const RELOAD = new InjectionToken<(url: string) => void>('RELOAD', {
  providedIn: 'root',
  factory: () => {
    const document = inject(DOCUMENT);
    return (url: string) => document.location.assign(url);
  },
});
