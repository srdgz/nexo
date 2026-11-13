import { DOCUMENT, DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import {
  THEME_COLORS,
  THEME_STORAGE_KEY,
  type ThemePreference,
  isThemePreference,
  resolveTheme,
} from './theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;
  private readonly media = this.window?.matchMedia?.(DARK_QUERY) ?? null;
  private readonly systemDark = signal(this.media?.matches ?? false);
  private readonly preferenceState = signal<ThemePreference>(this.readStored());

  readonly preference = this.preferenceState.asReadonly();
  readonly resolved = computed(() => resolveTheme(this.preferenceState(), this.systemDark()));

  constructor() {
    const listener = (event: MediaQueryListEvent) => {
      this.systemDark.set(event.matches);
      this.apply();
    };
    this.media?.addEventListener('change', listener);
    inject(DestroyRef).onDestroy(() => this.media?.removeEventListener('change', listener));
    this.apply();
  }

  use(preference: ThemePreference): void {
    this.preferenceState.set(preference);
    this.store(preference);
    this.apply();
  }

  private apply(): void {
    const root = this.document.documentElement;
    const preference = this.preferenceState();
    if (preference === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', preference);
    }
    this.document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLORS[this.resolved()]);
  }

  private readStored(): ThemePreference {
    try {
      const stored = this.window?.localStorage.getItem(THEME_STORAGE_KEY);
      return isThemePreference(stored) ? stored : 'system';
    } catch {
      return 'system';
    }
  }

  private store(preference: ThemePreference): void {
    try {
      this.window?.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      return;
    }
  }
}
