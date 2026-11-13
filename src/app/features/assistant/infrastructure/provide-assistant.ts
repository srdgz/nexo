import { type EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { APP_MODE } from '@core/app-mode/app-mode';
import {
  ASSISTANT_MODEL_LOADER,
  AssistantError,
  type AssistantModel,
} from '@core/assistant/assistant';
import { SupabaseClientProvider, isSupabaseConfigured } from '@core/supabase/supabase-client';
import { formatMoney } from '@shared/util/money';

function assistantModelLoader(): () => Promise<AssistantModel> {
  const mode = inject(APP_MODE);
  const supabase = inject(SupabaseClientProvider);
  const transloco = inject(TranslocoService);

  return async () => {
    if (mode === 'demo') {
      const { DemoAssistantModel } = await import('./demo-assistant.model');
      return new DemoAssistantModel(
        (key, params) => transloco.translate(key, params),
        (euros) => formatMoney(Math.round(euros * 100), transloco.getActiveLang()),
      );
    }
    if (!isSupabaseConfigured()) {
      return { reply: () => Promise.reject(new AssistantError('unavailable')) };
    }
    const [{ SupabaseAssistantModel }, client] = await Promise.all([
      import('./supabase-assistant.model'),
      supabase.get(),
    ]);
    return new SupabaseAssistantModel(client);
  };
}

export function provideAssistant(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ASSISTANT_MODEL_LOADER, useFactory: assistantModelLoader },
  ]);
}
