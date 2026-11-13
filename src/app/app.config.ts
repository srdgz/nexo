import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { provideI18n } from '@core/i18n/provide-i18n';
import { provideRealtime } from '@core/realtime/provide-realtime';
import { provideAssistant } from '@features/assistant/infrastructure/provide-assistant';
import { provideAuth } from '@features/auth/infrastructure/provide-auth';
import { provideFinances } from '@features/finances/infrastructure/provide-finances';
import { provideOrganization } from '@features/organization/infrastructure/provide-organization';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
      withViewTransitions(),
    ),
    provideI18n(),
    provideRealtime(),
    provideAuth(),
    provideFinances(),
    provideOrganization(),
    provideAssistant(),
  ],
};
