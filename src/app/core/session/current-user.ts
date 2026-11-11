import { Injectable, signal } from '@angular/core';

export interface CurrentUser {
  readonly displayName: string;
  readonly email: string;
  readonly avatarUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class CurrentUserStore {
  private readonly current = signal<CurrentUser | null>(null);

  readonly user = this.current.asReadonly();

  set(user: CurrentUser | null): void {
    this.current.set(user);
  }
}
