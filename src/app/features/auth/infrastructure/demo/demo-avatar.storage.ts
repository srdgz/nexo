import type { AvatarStorage } from '../../application/avatar-storage';
import { AuthError } from '../../domain/auth-error';

const SIZE = 256;

export class DemoAvatarStorage implements AvatarStorage {
  async upload(image: Blob): Promise<string> {
    try {
      const bitmap = await createImageBitmap(image);
      const side = Math.min(bitmap.width, bitmap.height);
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      canvas
        .getContext('2d')
        ?.drawImage(
          bitmap,
          (bitmap.width - side) / 2,
          (bitmap.height - side) / 2,
          side,
          side,
          0,
          0,
          SIZE,
          SIZE,
        );
      bitmap.close();
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch {
      throw new AuthError('avatar_upload');
    }
  }

  remove(): Promise<void> {
    return Promise.resolve();
  }
}
