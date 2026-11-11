import type { AuthRepository } from '../../application/auth-repository';
import { AuthError } from '../../domain/auth-error';
import type { AuthUser } from '../../domain/auth-user';

export const DEMO_USER: AuthUser = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'laura@nexo.demo',
  displayName: 'Laura Martín',
  locale: 'es',
};

const notInDemo = () => Promise.reject(new AuthError('unavailable'));

export class DemoAuthRepository implements AuthRepository {
  readonly available = true;

  currentUser = () => Promise.resolve(DEMO_USER);
  watch = () => () => undefined;
  signIn = () => Promise.resolve(DEMO_USER);
  signUp = notInDemo;
  signOut = () => Promise.resolve();
  resendVerification = notInDemo;
  requestPasswordReset = notInDemo;
  updatePassword = notInDemo;
  completeEmailLink = () => Promise.resolve(DEMO_USER);
}
