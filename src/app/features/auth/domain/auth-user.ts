export type UserLocale = 'es' | 'en';

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly locale: UserLocale;
}

export interface SignUpData {
  readonly fullName: string;
  readonly email: string;
  readonly password: string;
  readonly locale: UserLocale;
}
