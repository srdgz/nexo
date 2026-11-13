import type { AuthErrorCode } from './auth-error';

export const AVATAR_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export function avatarFileError(file: { type: string; size: number }): AuthErrorCode | null {
  if (!AVATAR_TYPES.includes(file.type)) {
    return 'avatar_type';
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return 'avatar_size';
  }
  return null;
}
