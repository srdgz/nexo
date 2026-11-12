import type { AuthChangeEvent, SupabaseClient } from '@supabase/supabase-js';
import type {
  AuthChange,
  AuthRepository,
  EmailLinkParams,
} from '../../application/auth-repository';
import { AuthError } from '../../domain/auth-error';
import type { AuthUser, ProfileChanges, SignUpData } from '../../domain/auth-user';
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

  async signInWithGoogle(redirectTo: string): Promise<void> {
    const { error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      throw mapAuthError(error);
    }
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

  async updateProfile(changes: ProfileChanges): Promise<AuthUser> {
    const current = await this.requireUser();
    const values: Record<string, string | number> = {};
    if (changes.fullName !== undefined) {
      values['full_name'] = changes.fullName;
    }
    if (changes.locale !== undefined) {
      values['locale'] = changes.locale;
    }
    if (changes.weekStartsOn !== undefined) {
      values['week_starts_on'] = changes.weekStartsOn;
    }
    const { error } = await this.client.from('profiles').update(values).eq('id', current.id);
    if (error) {
      throw mapAuthError(error);
    }
    const { data, error: updateError } = await this.client.auth.updateUser({ data: values });
    if (updateError) {
      throw mapAuthError(updateError);
    }
    return mapUser(data.user);
  }

  async changeEmail(email: string, redirectTo: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ email }, { emailRedirectTo: redirectTo });
    if (error) {
      throw mapAuthError(error);
    }
  }

  async changePassword(current: string, next: string): Promise<void> {
    const user = await this.requireUser();
    const { error: signInError } = await this.client.auth.signInWithPassword({
      email: user.email ?? '',
      password: current,
    });
    if (signInError) {
      throw signInError.code === 'invalid_credentials'
        ? new AuthError('wrong_password')
        : mapAuthError(signInError);
    }
    const { error } = await this.client.auth.updateUser({ password: next });
    if (error) {
      throw mapAuthError(error);
    }
  }

  async deleteAccount(): Promise<void> {
    const { error } = await this.client.functions.invoke('delete-account', { method: 'POST' });
    if (error) {
      throw new AuthError('unknown');
    }
    await this.client.auth.signOut({ scope: 'local' });
  }

  private async requireUser() {
    const { data } = await this.client.auth.getSession();
    if (!data.session) {
      throw new AuthError('unknown');
    }
    return data.session.user;
  }
}
