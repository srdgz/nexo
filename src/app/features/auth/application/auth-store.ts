import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { APP_MODE, RELOAD, leaveDemo } from '@core/app-mode/app-mode';
import { LanguageService } from '@core/i18n/language.service';
import { type CurrentUser, type PreferenceChanges, Session } from '@core/session/session';
import { ToastService } from '@shared/ui/toast/toast';
import { AuthError } from '../domain/auth-error';
import type { AuthUser, ProfileChanges, SignUpData } from '../domain/auth-user';
import { safeReturnUrl } from '../domain/return-url';
import {
  AUTH_REPOSITORY_LOADER,
  type AuthChange,
  type AuthRepository,
  type EmailLinkParams,
} from './auth-repository';

export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';

@Injectable({ providedIn: 'root' })
export class AuthStore extends Session {
  private readonly loader = inject(AUTH_REPOSITORY_LOADER);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);
  private readonly reload = inject(RELOAD);
  private readonly language = inject(LanguageService);

  private repository: AuthRepository | null = null;
  private signingOut = false;

  private readonly state = signal<{ status: AuthStatus; user: AuthUser | null }>({
    status: 'unknown',
    user: null,
  });
  private readonly recovering = signal(false);
  private readonly backendAvailable = signal(true);

  readonly mode = inject(APP_MODE);
  readonly status = computed(() => this.state().status);
  readonly authUser = computed(() => this.state().user);
  readonly isAuthenticated = computed(() => this.state().status === 'authenticated');
  readonly isRecovering = this.recovering.asReadonly();
  readonly available = this.backendAvailable.asReadonly();

  readonly user = computed<CurrentUser | null>(() => {
    const user = this.state().user;
    return user
      ? {
          displayName: user.displayName,
          email: user.email,
          avatarUrl: null,
          weekStartsOn: user.weekStartsOn,
        }
      : null;
  });

  async init(): Promise<void> {
    try {
      const repository = await this.loader();
      this.repository = repository;
      this.backendAvailable.set(repository.available);
      this.setUser(await repository.currentUser());
      repository.watch((change, user) => this.onChange(change, user));
    } catch {
      this.backendAvailable.set(false);
      this.setUser(null);
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    this.setUser(await this.repo().signIn(email.trim(), password));
  }

  signInWithGoogle(returnUrl: string): Promise<void> {
    return this.repo().signInWithGoogle(this.linkUrl(safeReturnUrl(returnUrl)));
  }

  async signUp(data: SignUpData): Promise<void> {
    await this.repo().signUp(
      { ...data, fullName: data.fullName.trim(), email: data.email.trim() },
      this.linkUrl('/app/dashboard'),
    );
  }

  resendVerification(email: string): Promise<void> {
    return this.repo().resendVerification(email.trim(), this.linkUrl('/app/dashboard'));
  }

  requestPasswordReset(email: string): Promise<void> {
    return this.repo().requestPasswordReset(email.trim(), this.linkUrl('/auth/reset-password'));
  }

  async updatePassword(password: string): Promise<void> {
    await this.repo().updatePassword(password);
    this.recovering.set(false);
  }

  async completeEmailLink(params: EmailLinkParams): Promise<void> {
    this.setUser(await this.repo().completeEmailLink(params));
  }

  async updateProfile(changes: ProfileChanges): Promise<void> {
    const fullName = changes.fullName?.trim();
    this.setUser(
      await this.repo().updateProfile({
        ...changes,
        ...(fullName !== undefined ? { fullName } : {}),
      }),
    );
  }

  async updatePreferences(changes: PreferenceChanges): Promise<void> {
    if (changes.locale) {
      await this.language.use(changes.locale);
    }
    if (this.isAuthenticated()) {
      await this.updateProfile(changes);
    }
  }

  changeEmail(email: string): Promise<void> {
    return this.repo().changeEmail(email.trim(), this.linkUrl('/app/settings/profile'));
  }

  changePassword(current: string, next: string): Promise<void> {
    return this.repo().changePassword(current, next);
  }

  async deleteAccount(): Promise<void> {
    this.signingOut = true;
    try {
      await this.repo().deleteAccount();
    } finally {
      this.signingOut = false;
    }
    this.setUser(null);
    this.toast.success(this.transloco.translate('settings.profile.deleted'));
    await this.router.navigateByUrl('/auth/login');
  }

  async signOut(): Promise<void> {
    if (this.mode === 'demo') {
      leaveDemo(this.document);
      this.reload('/auth/login');
      return;
    }
    this.signingOut = true;
    try {
      await this.repo().signOut();
    } finally {
      this.signingOut = false;
      this.setUser(null);
    }
    await this.router.navigateByUrl('/auth/login');
  }

  private onChange(change: AuthChange, user: AuthUser | null): void {
    if (change === 'password_recovery') {
      this.recovering.set(true);
    }
    if (change === 'signed_out' && this.isAuthenticated() && !this.signingOut) {
      this.setUser(null);
      this.toast.info(this.transloco.translate('auth.sessionExpired'));
      void this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }
    if (change !== 'signed_out') {
      this.setUser(user);
    }
  }

  private setUser(user: AuthUser | null): void {
    const previous = this.state().user;
    this.state.set({ status: user ? 'authenticated' : 'anonymous', user });
    if (user?.locale && user.id !== previous?.id && user.locale !== this.language.current()) {
      void this.language.use(user.locale);
    }
  }

  private repo(): AuthRepository {
    if (!this.repository || !this.repository.available) {
      throw new AuthError('unavailable');
    }
    return this.repository;
  }

  private linkUrl(next: string): string {
    const origin = this.document.location.origin;
    return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }
}
