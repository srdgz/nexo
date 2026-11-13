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
    [{ code: 'access_denied' }, 'cancelled'],
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
  it('reads the name and preferences from the user metadata', () => {
    expect(
      mapUser({
        id: 'u1',
        email: 'ben@example.com',
        created_at: '2026-11-02T10:00:00Z',
        user_metadata: { full_name: ' Ben Smith ', locale: 'en', week_starts_on: 0, theme: 'dark' },
        app_metadata: { providers: ['email'] },
      }),
    ).toEqual({
      id: 'u1',
      email: 'ben@example.com',
      displayName: 'Ben Smith',
      locale: 'en',
      weekStartsOn: 0,
      theme: 'dark',
      createdAt: '2026-11-02T10:00:00Z',
      hasPassword: true,
    });
  });

  it('falls back to the email name, no language and monday', () => {
    expect(
      mapUser({
        id: 'u2',
        email: 'carla@example.com',
        user_metadata: {},
        app_metadata: { providers: ['google'] },
      }),
    ).toEqual({
      id: 'u2',
      email: 'carla@example.com',
      displayName: 'carla',
      locale: null,
      weekStartsOn: 1,
      theme: null,
      createdAt: null,
      hasPassword: false,
    });
  });
});
