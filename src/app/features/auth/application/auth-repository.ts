import { InjectionToken } from '@angular/core';
import type { AuthUser, SignUpData } from '../domain/auth-user';

export type AuthChange = 'signed_in' | 'signed_out' | 'password_recovery' | 'user_updated';

export interface EmailLinkParams {
  readonly code: string | null;
  readonly errorCode: string | null;
}

export interface AuthRepository {
  readonly available: boolean;
  currentUser(): Promise<AuthUser | null>;
  watch(listener: (change: AuthChange, user: AuthUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<AuthUser>;
  signUp(data: SignUpData, redirectTo: string): Promise<void>;
  signOut(): Promise<void>;
  resendVerification(email: string, redirectTo: string): Promise<void>;
  requestPasswordReset(email: string, redirectTo: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  completeEmailLink(params: EmailLinkParams): Promise<AuthUser>;
}

export const AUTH_REPOSITORY_LOADER = new InjectionToken<() => Promise<AuthRepository>>(
  'AUTH_REPOSITORY_LOADER',
);
