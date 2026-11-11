import { AuthError, type AuthErrorCode } from '../../domain/auth-error';
import type { AuthUser, UserLocale } from '../../domain/auth-user';

export interface SupabaseUserLike {
  readonly id: string;
  readonly email?: string;
  readonly user_metadata?: Record<string, unknown>;
}

export interface SupabaseErrorLike {
  readonly name?: string;
  readonly code?: string;
  readonly status?: number;
}

const CODE_MAP: Readonly<Record<string, AuthErrorCode>> = {
  invalid_credentials: 'invalid_credentials',
  email_not_confirmed: 'email_not_confirmed',
  user_already_exists: 'email_taken',
  email_exists: 'email_taken',
  weak_password: 'weak_password',
  same_password: 'same_password',
  otp_expired: 'link_expired',
  flow_state_expired: 'link_expired',
  flow_state_not_found: 'link_expired',
  bad_code_verifier: 'link_expired',
  access_denied: 'cancelled',
  over_request_rate_limit: 'rate_limited',
  over_email_send_rate_limit: 'rate_limited',
};

export function mapAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) {
    return error;
  }
  const candidate = (error ?? {}) as SupabaseErrorLike;
  const mapped = candidate.code ? CODE_MAP[candidate.code] : undefined;
  if (mapped) {
    return new AuthError(mapped);
  }
  if (candidate.status === 429) {
    return new AuthError('rate_limited');
  }
  if (candidate.name === 'AuthRetryableFetchError' || error instanceof TypeError) {
    return new AuthError('network');
  }
  return new AuthError('unknown');
}

export function mapUser(user: SupabaseUserLike): AuthUser {
  const metadata = user.user_metadata ?? {};
  const email = user.email ?? '';
  const fullName = typeof metadata['full_name'] === 'string' ? metadata['full_name'].trim() : '';
  const locale: UserLocale = metadata['locale'] === 'en' ? 'en' : 'es';
  return {
    id: user.id,
    email,
    displayName: fullName || email.split('@')[0] || email,
    locale,
  };
}
