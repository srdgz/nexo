import {
  DOCUMENT,
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { APP_MODE } from '@core/app-mode/app-mode';
import { ASSISTANT_TOOLS } from '@core/assistant/assistant';
import { DemoChannel } from '@core/realtime/demo-channel';
import { REALTIME_LISTENERS, type RealtimeListener } from '@core/realtime/realtime';
import { SupabaseClientProvider } from '@core/supabase/supabase-client';
import { FINANCE_GATEWAY_LOADER, type FinanceGateway } from '../application/finance-gateway';
import { FinanceService } from '../application/finance.service';
import { financeAssistantTools } from '../application/finance-assistant-tools';

function financeGatewayLoader(): () => Promise<FinanceGateway> {
  const mode = inject(APP_MODE);
  const supabase = inject(SupabaseClientProvider);
  const transloco = inject(TranslocoService);
  const storage = inject(DOCUMENT).defaultView?.sessionStorage ?? null;
  const sync = mode === 'demo' ? inject(DemoChannel) : undefined;

  return async () => {
    if (mode === 'demo') {
      const [{ createDemoFinanceGateway }, { createFinanceSeed }] = await Promise.all([
        import('./demo/demo-finance.gateway'),
        import('./demo/demo-finance.seed'),
      ]);
      const language = transloco.getActiveLang() === 'en' ? 'en' : 'es';
      return createDemoFinanceGateway({
        storage,
        sync,
        seed: () => createFinanceSeed(new Date(), language),
      });
    }
    const [{ createSupabaseFinanceGateway }, client] = await Promise.all([
      import('./supabase/supabase-finance.gateway'),
      supabase.get(),
    ]);
    return createSupabaseFinanceGateway(client);
  };
}

function realtimeListener(): RealtimeListener {
  const finance = inject(FinanceService);
  return { topic: 'finances', refresh: () => finance.refresh() };
}

export function provideFinances(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: FINANCE_GATEWAY_LOADER, useFactory: financeGatewayLoader },
    { provide: REALTIME_LISTENERS, multi: true, useFactory: realtimeListener },
    { provide: ASSISTANT_TOOLS, multi: true, useFactory: financeAssistantTools },
  ]);
}
