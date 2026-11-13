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
import { TASK_LOOKUP, type TaskLookup } from '@features/finances/application/task-lookup';
import {
  ORGANIZATION_GATEWAY_LOADER,
  type OrganizationGateway,
} from '../application/organization-gateway';
import { OrganizationService } from '../application/organization.service';
import { organizationAssistantTools } from '../application/organization-assistant-tools';
import { isOpen } from '../domain/task';

function organizationGatewayLoader(): () => Promise<OrganizationGateway> {
  const mode = inject(APP_MODE);
  const supabase = inject(SupabaseClientProvider);
  const transloco = inject(TranslocoService);
  const storage = inject(DOCUMENT).defaultView?.sessionStorage ?? null;
  const sync = mode === 'demo' ? inject(DemoChannel) : undefined;

  return async () => {
    if (mode === 'demo') {
      const [{ createDemoOrganizationGateway }, { createOrganizationSeed }] = await Promise.all([
        import('./demo/demo-organization.gateway'),
        import('./demo/demo-organization.seed'),
      ]);
      const language = transloco.getActiveLang() === 'en' ? 'en' : 'es';
      return createDemoOrganizationGateway({
        storage,
        sync,
        seed: () => createOrganizationSeed(new Date(), language),
      });
    }
    const [{ createSupabaseOrganizationGateway }, client] = await Promise.all([
      import('./supabase/supabase-organization.gateway'),
      supabase.get(),
    ]);
    return createSupabaseOrganizationGateway(client);
  };
}

function realtimeListener(): RealtimeListener {
  const organization = inject(OrganizationService);
  return { topic: 'organization', refresh: () => organization.refresh() };
}

function taskLookup(): TaskLookup {
  const organization = inject(OrganizationService);
  return {
    options: async () =>
      (await organization.tasks())
        .map((task) => ({ id: task.id, title: task.title, open: isOpen(task) }))
        .sort((a, b) => Number(b.open) - Number(a.open) || a.title.localeCompare(b.title)),
  };
}

export function provideOrganization(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ORGANIZATION_GATEWAY_LOADER, useFactory: organizationGatewayLoader },
    { provide: TASK_LOOKUP, useFactory: taskLookup },
    { provide: REALTIME_LISTENERS, multi: true, useFactory: realtimeListener },
    { provide: ASSISTANT_TOOLS, multi: true, useFactory: organizationAssistantTools },
  ]);
}
