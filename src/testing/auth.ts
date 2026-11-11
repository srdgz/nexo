import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RELOAD } from '@core/app-mode/app-mode';
import { Session } from '@core/session/session';
import {
  AUTH_REPOSITORY_LOADER,
  type AuthChange,
  type AuthRepository,
  type EmailLinkParams,
} from '@features/auth/application/auth-repository';
import { AuthStore } from '@features/auth/application/auth-store';
import { AuthError, type AuthErrorCode } from '@features/auth/domain/auth-error';
import type { AuthUser, SignUpData } from '@features/auth/domain/auth-user';

export const TEST_USER: AuthUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'laura@example.com',
  displayName: 'Laura Martín',
  locale: 'es',
};

export class FakeAuthRepository implements AuthRepository {
  available = true;
  user: AuthUser | null;
  failWith: AuthErrorCode | null = null;
  readonly calls: { method: string; args: unknown[] }[] = [];
  private listener: ((change: AuthChange, user: AuthUser | null) => void) | null = null;

  constructor(user: AuthUser | null = null) {
    this.user = user;
  }

  emit(change: AuthChange, user: AuthUser | null): void {
    this.listener?.(change, user);
  }

  currentUser = () => Promise.resolve(this.user);

  watch = (listener: (change: AuthChange, user: AuthUser | null) => void) => {
    this.listener = listener;
    return () => (this.listener = null);
  };

  signIn = (email: string, password: string) =>
    this.run('signIn', [email, password], () => {
      this.user = { ...TEST_USER, email };
      return this.user;
    });

  signInWithGoogle = (redirectTo: string) =>
    this.run('signInWithGoogle', [redirectTo], () => undefined);

  signUp = (data: SignUpData, redirectTo: string) =>
    this.run('signUp', [data, redirectTo], () => undefined);

  signOut = () =>
    this.run('signOut', [], () => {
      this.user = null;
    });

  resendVerification = (email: string, redirectTo: string) =>
    this.run('resendVerification', [email, redirectTo], () => undefined);

  requestPasswordReset = (email: string, redirectTo: string) =>
    this.run('requestPasswordReset', [email, redirectTo], () => undefined);

  updatePassword = (password: string) => this.run('updatePassword', [password], () => undefined);

  completeEmailLink = (params: EmailLinkParams) =>
    this.run('completeEmailLink', [params], () => TEST_USER);

  private run<T>(method: string, args: unknown[], result: () => T): Promise<T> {
    this.calls.push({ method, args });
    if (this.failWith) {
      return Promise.reject(new AuthError(this.failWith));
    }
    return Promise.resolve(result());
  }
}

export function provideTestAuth(
  repository: FakeAuthRepository = new FakeAuthRepository(TEST_USER),
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: AUTH_REPOSITORY_LOADER, useValue: () => Promise.resolve(repository) },
    { provide: Session, useExisting: AuthStore },
    { provide: RELOAD, useValue: () => undefined },
  ]);
}

export function initTestAuth(): Promise<void> {
  return TestBed.inject(AuthStore).init();
}
