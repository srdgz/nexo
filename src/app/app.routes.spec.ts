import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { TranslatedTitleStrategy } from '@core/i18n/translated-title.strategy';
import en from '../../public/i18n/en.json';
import es from '../../public/i18n/es.json';
import { routes } from './app.routes';

const screens: [url: string, title: string][] = [
  ['/auth/login', 'Inicia sesión'],
  ['/auth/register', 'Crea tu cuenta'],
  ['/auth/verify-email', 'Revisa tu correo'],
  ['/auth/forgot-password', 'Recuperar contraseña'],
  ['/auth/reset-password', 'Nueva contraseña'],
  ['/app/dashboard', 'Inicio'],
  ['/app/finances/overview', 'Resumen financiero'],
  ['/app/finances/transactions', 'Movimientos'],
  ['/app/finances/transactions/new', 'Nuevo movimiento'],
  ['/app/finances/transactions/42/edit', 'Editar movimiento'],
  ['/app/finances/budgets', 'Presupuestos'],
  ['/app/finances/categories', 'Categorías'],
  ['/app/organization/tasks', 'Tareas'],
  ['/app/organization/tasks/new', 'Nueva tarea'],
  ['/app/organization/tasks/7/edit', 'Editar tarea'],
  ['/app/organization/calendar', 'Calendario'],
  ['/app/organization/calendar/events/new', 'Nuevo evento'],
  ['/app/organization/calendar/events/3/edit', 'Editar evento'],
  ['/app/settings/profile', 'Perfil'],
  ['/app/settings/preferences', 'Preferencias'],
];

describe('app routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { es, en },
          translocoConfig: { availableLangs: ['es', 'en'], defaultLang: 'es' },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideRouter(routes),
        { provide: TitleStrategy, useExisting: TranslatedTitleStrategy },
      ],
    });
  });

  it.each(screens)('%s shows "%s" as heading and page title', async (url, title) => {
    const harness = await RouterTestingHarness.create(url);

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe(title);
    expect(TestBed.inject(Title).getTitle()).toBe(`${title} · NEXO`);
  });

  it.each([
    ['/', '/app/dashboard'],
    ['/app', '/app/dashboard'],
    ['/auth', '/auth/login'],
    ['/app/finances', '/app/finances/overview'],
    ['/app/organization', '/app/organization/tasks'],
    ['/app/settings', '/app/settings/profile'],
  ])('%s redirects to %s', async (from, to) => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(from);

    expect(TestBed.inject(Router).url).toBe(to);
  });

  it('shows the not found page for unknown urls', async () => {
    const harness = await RouterTestingHarness.create('/does-not-exist');

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'No encontramos esta página',
    );
  });

  it('translates the page title when the language changes', async () => {
    await RouterTestingHarness.create('/app/finances/transactions');

    TestBed.inject(TranslocoService).setActiveLang('en');

    expect(TestBed.inject(Title).getTitle()).toBe('Transactions · NEXO');
  });
});
