import type { Signal } from '@angular/core';
import type { AppMode } from '../app-mode/app-mode';
import type { Language } from '../i18n/language';
import type { ThemePreference } from '../theme/theme';

export type WeekStart = 0 | 1;

export interface CurrentUser {
  readonly displayName: string;
  readonly email: string;
  readonly avatarUrl: string | null;
  readonly weekStartsOn: WeekStart;
}

export interface PreferenceChanges {
  readonly locale?: Language;
  readonly weekStartsOn?: WeekStart;
  readonly theme?: ThemePreference;
}

export abstract class Session {
  abstract readonly user: Signal<CurrentUser | null>;
  abstract readonly mode: AppMode;
  abstract signOut(): Promise<void>;
  abstract updatePreferences(changes: PreferenceChanges): Promise<void>;
}
