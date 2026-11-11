import { AuthError } from '../../domain/auth-error';
import { mapAuthError, mapUser } from './supabase-auth.mapper';

describe('mapAuthError', () => {
  it.each([
    [{ code: 'invalid_credentials', status: 400 }, 'invalid_credentials'],
    [{ code: 'email_not_confirmed', status: 400 }, 'email_not_confirmed'],
    [{ code: 'user_already_exists', status: 422 }, 'email_taken'],
    [{ code: 'weak_password', status: 422 }, 'weak_password'],
    [{ code: 'same_password', status: 422 }, 'same_password'],
    [{ code: 'otp_expired', status: 403 }, 'link_expired'],
    [{ code: 'flow_state_not_found', status: 404 }, 'link_expired'],
    [{ code: 'over_email_send_rate_limit', status: 429 }, 'rate_limited'],
    [{ status: 429 }, 'rate_limited'],
    [{ name: 'AuthRetryableFetchError', status: 0 }, 'network'],
    [new TypeError('Failed to fetch'), 'network'],
    [{ code: 'something_new', status: 500 }, 'unknown'],
    [null, 'unknown'],
  ])('%o → %s', (error, code) => {
    expect(mapAuthError(error).code).toBe(code);
  });

  it('returns domain errors unchanged', () => {
    const error = new AuthError('unavailable');
    expect(mapAuthError(error)).toBe(error);
  });
});

describe('mapUser', () => {
  it('reads the name and language from the user metadata', () => {
    expect(
      mapUser({
        id: 'u1',
        email: 'ben@example.com',
        user_metadata: { full_name: ' Ben Smith ', locale: 'en' },
      }),
    ).toEqual({ id: 'u1', email: 'ben@example.com', displayName: 'Ben Smith', locale: 'en' });
  });

  it('falls back to the email name and Spanish', () => {
    expect(mapUser({ id: 'u2', email: 'carla@example.com', user_metadata: {} })).toEqual({
      id: 'u2',
      email: 'carla@example.com',
      displayName: 'carla',
      locale: 'es',
    });
  });
});
