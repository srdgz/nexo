import type { AuthRepository } from '../../application/auth-repository';
import { AuthError } from '../../domain/auth-error';
import type { AuthUser, ProfileChanges } from '../../domain/auth-user';

export const DEMO_PROFILE_KEY = 'nexo.demo.profile';

const DAY = 24 * 60 * 60 * 1000;

export const DEMO_USER: AuthUser = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'laura@nexo.demo',
  displayName: 'Laura Martín',
  locale: null,
  weekStartsOn: 1,
  createdAt: null,
  hasPassword: true,
};

const notInDemo = () => Promise.reject(new AuthError('unavailable'));

function defaultStorage(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export class DemoAuthRepository implements AuthRepository {
  readonly available = true;
  private user: AuthUser;

  constructor(
    private readonly storage: Storage | null = defaultStorage(),
    now = new Date(),
  ) {
    this.user = {
      ...DEMO_USER,
      createdAt: new Date(now.getTime() - 40 * DAY).toISOString(),
      ...this.read(),
    };
  }

  currentUser = () => Promise.resolve(this.user);
  watch = () => () => undefined;
  signIn = () => Promise.resolve(this.user);
  signInWithGoogle = notInDemo;
  signUp = notInDemo;
  signOut = () => Promise.resolve();
  resendVerification = notInDemo;
  requestPasswordReset = notInDemo;
  updatePassword = notInDemo;
  completeEmailLink = () => Promise.resolve(this.user);
  changeEmail = notInDemo;
  changePassword = notInDemo;
  deleteAccount = notInDemo;

  updateProfile = (changes: ProfileChanges): Promise<AuthUser> => {
    this.user = {
      ...this.user,
      ...(changes.fullName !== undefined ? { displayName: changes.fullName } : {}),
      ...(changes.locale !== undefined ? { locale: changes.locale } : {}),
      ...(changes.weekStartsOn !== undefined ? { weekStartsOn: changes.weekStartsOn } : {}),
    };
    this.write();
    return Promise.resolve(this.user);
  };

  private read(): Partial<AuthUser> {
    try {
      const raw = this.storage?.getItem(DEMO_PROFILE_KEY);
      if (!raw) {
        return {};
      }
      const stored = JSON.parse(raw) as Partial<AuthUser>;
      return {
        ...(typeof stored.displayName === 'string' ? { displayName: stored.displayName } : {}),
        ...(stored.locale === 'es' || stored.locale === 'en' ? { locale: stored.locale } : {}),
        ...(stored.weekStartsOn === 0 || stored.weekStartsOn === 1
          ? { weekStartsOn: stored.weekStartsOn }
          : {}),
      };
    } catch {
      return {};
    }
  }

  private write(): void {
    try {
      const { displayName, locale, weekStartsOn } = this.user;
      this.storage?.setItem(
        DEMO_PROFILE_KEY,
        JSON.stringify({ displayName, locale, weekStartsOn }),
      );
    } catch {
      return;
    }
  }
}
