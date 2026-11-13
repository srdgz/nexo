import { InjectionToken } from '@angular/core';

export interface AvatarStorage {
  upload(image: Blob): Promise<string>;
  remove(): Promise<void>;
}

export const AVATAR_STORAGE_LOADER = new InjectionToken<() => Promise<AvatarStorage>>(
  'AVATAR_STORAGE_LOADER',
);
