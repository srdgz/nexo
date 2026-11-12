import {
  DOCUMENT,
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { APP_MODE } from '@core/app-mode/app-mode';
import { SupabaseClientProvider } from '@core/supabase/supabase-client';
import { FINANCE_GATEWAY_LOADER, type FinanceGateway } from '../application/finance-gateway';

function financeGatewayLoader(): () => Promise<FinanceGateway> {
  const mode = inject(APP_MODE);
  const supabase = inject(SupabaseClientProvider);
  const transloco = inject(TranslocoService);
  const storage = inject(DOCUMENT).defaultView?.sessionStorage ?? null;

  return async () => {
    if (mode === 'demo') {
      const [{ createDemoFinanceGateway }, { createFinanceSeed }] = await Promise.all([
        import('./demo/demo-finance.gateway'),
        import('./demo/demo-finance.seed'),
      ]);
      const language = transloco.getActiveLang() === 'en' ? 'en' : 'es';
      return createDemoFinanceGateway({
        storage,
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

export function provideFinances(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: FINANCE_GATEWAY_LOADER, useFactory: financeGatewayLoader },
  ]);
}
