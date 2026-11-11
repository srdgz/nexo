import { AuthError, toAuthError } from './auth-error';
import { checkPassword, isValidPassword } from './password-policy';
import { safeLinkTarget, safeReturnUrl } from './return-url';

describe('password policy', () => {
  it.each([
    ['', false, false],
    ['short1', false, true],
    ['onlyletters', true, false],
    ['12345678', true, false],
    ['nexo2026', true, true],
    ['contraseña9', true, true],
  ])('"%s" → length %s, letters and digits %s', (password, length, lettersAndDigits) => {
    expect(checkPassword(password)).toEqual({ length, lettersAndDigits });
    expect(isValidPassword(password)).toBe(length && lettersAndDigits);
  });
});

describe('safeReturnUrl', () => {
  it.each([
    ['/app/finances/budgets?month=2026-11', '/app/finances/budgets?month=2026-11'],
    [undefined, '/app/dashboard'],
    ['', '/app/dashboard'],
    ['/auth/login', '/app/dashboard'],
    ['https://evil.example', '/app/dashboard'],
    ['//evil.example/app', '/app/dashboard'],
    ['/app\\..\\evil', '/app/dashboard'],
  ])('%s → %s', (value, expected) => {
    expect(safeReturnUrl(value)).toBe(expected);
  });

  it('only allows the reset page or app pages after an email link', () => {
    expect(safeLinkTarget('/auth/reset-password')).toBe('/auth/reset-password');
    expect(safeLinkTarget('/auth/login')).toBe('/app/dashboard');
    expect(safeLinkTarget(null)).toBe('/app/dashboard');
  });
});

describe('toAuthError', () => {
  it('keeps auth errors and wraps anything else as unknown', () => {
    const error = new AuthError('network');

    expect(toAuthError(error)).toBe(error);
    expect(toAuthError(new Error('boom')).code).toBe('unknown');
  });
});
