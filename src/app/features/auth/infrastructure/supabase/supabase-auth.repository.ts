import type { AuthChangeEvent, SupabaseClient } from '@supabase/supabase-js';
import type {
  AuthChange,
  AuthRepository,
  EmailLinkParams,
} from '../../application/auth-repository';
import { AuthError } from '../../domain/auth-error';
import type { AuthUser, SignUpData } from '../../domain/auth-user';
import { mapAuthError, mapUser } from './supabase-auth.mapper';

const CHANGES: Partial<Record<AuthChangeEvent, AuthChange>> = {
  SIGNED_IN: 'signed_in',
  SIGNED_OUT: 'signed_out',
  PASSWORD_RECOVERY: 'password_recovery',
  USER_UPDATED: 'user_updated',
  TOKEN_REFRESHED: 'user_updated',
};

export class SupabaseAuthRepository implements AuthRepository {
  readonly available = true;

  constructor(private readonly client: SupabaseClient) {}

  async currentUser(): Promise<AuthUser | null> {
    const { data } = await this.client.auth.getSession();
    return data.session ? mapUser(data.session.user) : null;
  }

  watch(listener: (change: AuthChange, user: AuthUser | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((event, session) => {
      const change = CHANGES[event];
      if (change) {
        setTimeout(() => listener(change, session ? mapUser(session.user) : null));
      }
    });
    return () => data.subscription.unsubscribe();
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) {
      throw mapAuthError(error);
    }
    return mapUser(data.user);
  }

  async signUp(data: SignUpData, redirectTo: string): Promise<void> {
    const { data: result, error } = await this.client.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: redirectTo,
        data: { full_name: data.fullName, locale: data.locale },
      },
    });
    if (error) {
      throw mapAuthError(error);
    }
    if (result.user && result.user.identities?.length === 0) {
      throw new AuthError('email_taken');
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw mapAuthError(error);
    }
  }

  async resendVerification(email: string, redirectTo: string): Promise<void> {
    const { error } = await this.client.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      throw mapAuthError(error);
    }
  }

  async requestPasswordReset(email: string, redirectTo: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      throw mapAuthError(error);
    }
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ password });
    if (error) {
      throw mapAuthError(error);
    }
  }

  async completeEmailLink(params: EmailLinkParams): Promise<AuthUser> {
    if (params.errorCode) {
      throw mapAuthError({ code: params.errorCode });
    }
    if (!params.code) {
      throw new AuthError('link_expired');
    }
    const { data, error } = await this.client.auth.exchangeCodeForSession(params.code);
    if (error) {
      throw mapAuthError(error);
    }
    return mapUser(data.user);
  }
}
