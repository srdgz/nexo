import { type EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { APP_MODE } from '../app-mode/app-mode';
import { SupabaseClientProvider, isSupabaseConfigured } from '../supabase/supabase-client';
import { DemoChannel } from './demo-channel';
import { CHANGE_FEED_LOADER, type ChangeFeed, NO_CHANGES } from './realtime';

function changeFeedLoader(): () => Promise<ChangeFeed> {
  const mode = inject(APP_MODE);
  const supabase = inject(SupabaseClientProvider);
  const demo = inject(DemoChannel);

  return async () => {
    if (mode === 'demo') {
      return demo;
    }
    if (!isSupabaseConfigured()) {
      return NO_CHANGES;
    }
    const [{ SupabaseChangeFeed }, client] = await Promise.all([
      import('./supabase-change-feed'),
      supabase.get(),
    ]);
    return new SupabaseChangeFeed(client);
  };
}

export function provideRealtime(): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: CHANGE_FEED_LOADER, useFactory: changeFeedLoader }]);
}
