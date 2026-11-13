import type { AvatarStorage } from '../application/avatar-storage';
import { AuthError } from '../domain/auth-error';

export class OfflineAvatarStorage implements AvatarStorage {
  upload(): Promise<string> {
    return Promise.reject(new AuthError('unavailable'));
  }

  remove(): Promise<void> {
    return Promise.reject(new AuthError('unavailable'));
  }
}
