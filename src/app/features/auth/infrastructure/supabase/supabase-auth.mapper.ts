import { AuthError, type AuthErrorCode } from '../../domain/auth-error';
import type { AuthUser, UserLocale, UserTheme, WeekStart } from '../../domain/auth-user';

export interface SupabaseUserLike {
  readonly id: string;
  readonly email?: string;
  readonly created_at?: string;
  readonly user_metadata?: Record<string, unknown>;
  readonly app_metadata?: Record<string, unknown>;
}

export interface SupabaseErrorLike {
  readonly name?: string;
  readonly code?: string;
  readonly status?: number;
}

const CODE_MAP: Readonly<Record<string, AuthErrorCode>> = {
  invalid_credentials: 'invalid_credentials',
  email_address_invalid: 'invalid_email',
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

function avatarOf(metadata: Record<string, unknown>): string | null {
  if ('photo_url' in metadata) {
    return typeof metadata['photo_url'] === 'string' ? metadata['photo_url'] : null;
  }
  const provided = metadata['avatar_url'] ?? metadata['picture'];
  return typeof provided === 'string' && provided.startsWith('https://') ? provided : null;
}

export function mapUser(user: SupabaseUserLike): AuthUser {
  const metadata = user.user_metadata ?? {};
  const email = user.email ?? '';
  const fullName = typeof metadata['full_name'] === 'string' ? metadata['full_name'].trim() : '';
  const locale: UserLocale | null =
    metadata['locale'] === 'en' || metadata['locale'] === 'es' ? metadata['locale'] : null;
  const weekStartsOn: WeekStart = metadata['week_starts_on'] === 0 ? 0 : 1;
  const rawTheme = metadata['theme'];
  const theme: UserTheme | null =
    rawTheme === 'system' || rawTheme === 'light' || rawTheme === 'dark' ? rawTheme : null;
  const providers = user.app_metadata?.['providers'];
  return {
    id: user.id,
    email,
    displayName: fullName || email.split('@')[0] || email,
    locale,
    weekStartsOn,
    theme,
    avatarUrl: avatarOf(metadata),
    createdAt: user.created_at ?? null,
    hasPassword: Array.isArray(providers) ? providers.includes('email') : true,
  };
}
