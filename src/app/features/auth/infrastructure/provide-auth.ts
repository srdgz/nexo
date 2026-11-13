import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { APP_MODE } from '@core/app-mode/app-mode';
import { Session } from '@core/session/session';
import { SupabaseClientProvider, isSupabaseConfigured } from '@core/supabase/supabase-client';
import { AUTH_REPOSITORY_LOADER, type AuthRepository } from '../application/auth-repository';
import { AuthStore } from '../application/auth-store';
import { AVATAR_STORAGE_LOADER, type AvatarStorage } from '../application/avatar-storage';
import { OfflineAuthRepository } from './offline-auth.repository';
import { OfflineAvatarStorage } from './offline-avatar.storage';

function authRepositoryLoader(): () => Promise<AuthRepository> {
  const mode = inject(APP_MODE);
  const supabase = inject(SupabaseClientProvider);

  return async () => {
    if (mode === 'demo') {
      const { DemoAuthRepository } = await import('./demo/demo-auth.repository');
      return new DemoAuthRepository();
    }
    if (!isSupabaseConfigured()) {
      return new OfflineAuthRepository();
    }
    const [{ SupabaseAuthRepository }, client] = await Promise.all([
      import('./supabase/supabase-auth.repository'),
      supabase.get(),
    ]);
    return new SupabaseAuthRepository(client);
  };
}

function avatarStorageLoader(): () => Promise<AvatarStorage> {
  const mode = inject(APP_MODE);
  const supabase = inject(SupabaseClientProvider);

  return async () => {
    if (mode === 'demo') {
      const { DemoAvatarStorage } = await import('./demo/demo-avatar.storage');
      return new DemoAvatarStorage();
    }
    if (!isSupabaseConfigured()) {
      return new OfflineAvatarStorage();
    }
    const [{ CloudinaryAvatarStorage }, client] = await Promise.all([
      import('./cloudinary/cloudinary-avatar.storage'),
      supabase.get(),
    ]);
    return new CloudinaryAvatarStorage(client);
  };
}

export function provideAuth(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: AUTH_REPOSITORY_LOADER, useFactory: authRepositoryLoader },
    { provide: AVATAR_STORAGE_LOADER, useFactory: avatarStorageLoader },
    { provide: Session, useExisting: AuthStore },
    provideAppInitializer(() => inject(AuthStore).init()),
  ]);
}
