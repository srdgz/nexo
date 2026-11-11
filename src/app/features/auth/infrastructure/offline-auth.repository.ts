import type { AuthRepository } from '../application/auth-repository';
import { AuthError } from '../domain/auth-error';

const unavailable = () => Promise.reject(new AuthError('unavailable'));

export class OfflineAuthRepository implements AuthRepository {
  readonly available = false;

  currentUser = () => Promise.resolve(null);
  watch = () => () => undefined;
  signIn = unavailable;
  signUp = unavailable;
  signOut = () => Promise.resolve();
  resendVerification = unavailable;
  requestPasswordReset = unavailable;
  updatePassword = unavailable;
  completeEmailLink = unavailable;
}
