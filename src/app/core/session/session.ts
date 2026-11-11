import type { Signal } from '@angular/core';
import type { AppMode } from '../app-mode/app-mode';

export interface CurrentUser {
  readonly displayName: string;
  readonly email: string;
  readonly avatarUrl: string | null;
}

export abstract class Session {
  abstract readonly user: Signal<CurrentUser | null>;
  abstract readonly mode: AppMode;
  abstract signOut(): Promise<void>;
}
