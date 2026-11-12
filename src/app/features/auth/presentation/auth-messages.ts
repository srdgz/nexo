import type { AuthErrorCode } from '../domain/auth-error';

const MESSAGE_KEYS: Readonly<Record<AuthErrorCode, string>> = {
  invalid_credentials: 'auth.errors.invalidCredentials',
  wrong_password: 'auth.errors.wrongPassword',
  invalid_email: 'auth.errors.invalidEmail',
  email_not_confirmed: 'auth.errors.emailNotConfirmed',
  email_taken: 'auth.errors.emailTaken',
  weak_password: 'auth.errors.weakPassword',
  same_password: 'auth.errors.samePassword',
  link_expired: 'auth.errors.linkExpired',
  cancelled: 'auth.errors.cancelled',
  rate_limited: 'auth.errors.rateLimited',
  network: 'auth.errors.network',
  unavailable: 'auth.errors.unavailable',
  unknown: 'auth.errors.unknown',
};

export function authMessageKey(code: AuthErrorCode): string {
  return MESSAGE_KEYS[code];
}
