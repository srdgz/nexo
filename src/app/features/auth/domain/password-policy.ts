export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordChecks {
  readonly length: boolean;
  readonly lettersAndDigits: boolean;
}

export function checkPassword(password: string): PasswordChecks {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH,
    lettersAndDigits: /\p{L}/u.test(password) && /\d/.test(password),
  };
}

export function isValidPassword(password: string): boolean {
  const checks = checkPassword(password);
  return checks.length && checks.lettersAndDigits;
}
