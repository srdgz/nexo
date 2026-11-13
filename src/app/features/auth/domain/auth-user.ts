export type UserLocale = 'es' | 'en';

export type WeekStart = 0 | 1;

export type UserTheme = 'system' | 'light' | 'dark';

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly locale: UserLocale | null;
  readonly weekStartsOn: WeekStart;
  readonly theme: UserTheme | null;
  readonly createdAt: string | null;
  readonly hasPassword: boolean;
}

export interface SignUpData {
  readonly fullName: string;
  readonly email: string;
  readonly password: string;
  readonly locale: UserLocale;
}

export interface ProfileChanges {
  readonly fullName?: string;
  readonly locale?: UserLocale;
  readonly weekStartsOn?: WeekStart;
  readonly theme?: UserTheme;
}

export const DELETE_CONFIRMATION: Readonly<Record<UserLocale, string>> = {
  es: 'ELIMINAR',
  en: 'DELETE',
};

export function isValidFullName(value: string): boolean {
  const length = value.trim().length;
  return length >= 1 && length <= 80;
}

export function isSameEmail(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
