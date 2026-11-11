export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'email_taken'
  | 'weak_password'
  | 'same_password'
  | 'link_expired'
  | 'cancelled'
  | 'rate_limited'
  | 'network'
  | 'unavailable'
  | 'unknown';

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
  }
}

export function toAuthError(error: unknown): AuthError {
  return error instanceof AuthError ? error : new AuthError('unknown');
}
