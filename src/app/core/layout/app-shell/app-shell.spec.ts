import { TestBed } from '@angular/core/testing';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { provideTestI18n } from '../../../../testing/i18n';
import { LanguageService } from '../../i18n/language.service';
import { TranslatedTitleStrategy } from '../../i18n/translated-title.strategy';
import { APP_MODE } from '../../app-mode/app-mode';
import {
  FakeAuthRepository,
  TEST_USER,
  initTestAuth,
  provideTestAuth,
} from '../../../../testing/auth';
import { QUICK_ADD, SECTIONS, sectionFor } from '../navigation';

describe('navigation', () => {
  it.each([
    ['/app/finances/budgets', 'nav.finances'],
    ['/app/organization/calendar/events/new', 'nav.organization'],
    ['/app/settings/profile', 'nav.settings'],
    ['/app/dashboard', null],
  ])('%s belongs to %s', (url, section) => {
    expect(sectionFor(url)?.labelKey ?? null).toBe(section);
  });
});

describe('AppShell', () => {
  let repository: FakeAuthRepository;

  beforeEach(async () => {
    localStorage.clear();
    repository = new FakeAuthRepository(TEST_USER);
    TestBed.configureTestingModule({
      imports: [provideTestI18n()],
      providers: [
        provideRouter(routes),
        provideTestAuth(repository),
        { provide: TitleStrategy, useExisting: TranslatedTitleStrategy },
      ],
    });
    await initTestAuth();
  });

  it.each([...SECTIONS.flatMap((section) => section.items), ...QUICK_ADD].map((item) => item.path))(
    'links to an existing screen: %s',
    async (path) => {
      const harness = await RouterTestingHarness.create(path);

      expect(TestBed.inject(Router).url).toContain(path);
      expect(
        harness.routeNativeElement?.querySelector('nx-app-shell, nx-pending-page'),
      ).toBeTruthy();
    },
  );

  it('marks the current page in the sidebar', async () => {
    const harness = await RouterTestingHarness.create('/app/finances/transactions');
    const current = harness.routeNativeElement!.querySelectorAll('nx-sidebar [aria-current=page]');

    expect(Array.from(current).map((link) => link.textContent?.trim())).toEqual(['Movimientos']);
  });

  it('shows the signed-in user in the sidebar and the header', async () => {
    const harness = await RouterTestingHarness.create('/app/dashboard');
    const root = harness.routeNativeElement!;

    expect(root.querySelector('nx-sidebar .user-name')?.textContent).toBe('Laura Martín');
    expect(root.querySelector('nx-app-header nx-avatar')?.textContent?.trim()).toBe('LM');
    expect(root.querySelector('nx-demo-banner')).toBeNull();
  });

  it('signs out from the user menu', async () => {
    const harness = await RouterTestingHarness.create('/app/dashboard');
    const signOut = Array.from(
      harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>(
        'nx-app-header [nx-menu-item]',
      ),
    ).find((item) => item.textContent?.includes('Cerrar sesión'))!;

    signOut.click();
    await harness.fixture.whenStable();

    expect(repository.calls.map((call) => call.method)).toContain('signOut');
    expect(TestBed.inject(Router).url).toBe('/auth/login');
  });

  it('switches the language from the user menu', async () => {
    const harness = await RouterTestingHarness.create('/app/dashboard');
    const english = harness.routeNativeElement!.querySelector<HTMLButtonElement>(
      'nx-app-header button[lang=en]',
    )!;

    expect(english.getAttribute('aria-checked')).toBe('false');
    english.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(LanguageService).current()).toBe('en');
    expect(english.getAttribute('aria-checked')).toBe('true');
    expect(harness.routeNativeElement!.querySelector('h1')?.textContent?.trim()).toBe('Home');
  });
});

describe('AppShell in demo mode', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [provideTestI18n()],
      providers: [
        provideRouter(routes),
        provideTestAuth(),
        { provide: APP_MODE, useValue: 'demo' },
        { provide: TitleStrategy, useExisting: TranslatedTitleStrategy },
      ],
    });
    await initTestAuth();
  });

  it('shows the demo banner as a labelled region and offers to leave the demo', async () => {
    const harness = await RouterTestingHarness.create('/app/dashboard');
    const root = harness.routeNativeElement!;
    const banner = root.querySelector('nx-demo-banner')!;

    expect(banner.getAttribute('role')).toBe('region');
    expect(document.getElementById(banner.getAttribute('aria-labelledby')!)?.textContent).toContain(
      'demo con datos ficticios',
    );
    const menus = Array.from(root.querySelectorAll('nx-app-header nx-menu'));
    expect(menus.map((menu) => menu.textContent).join(' ')).toContain('Salir de la demo');
  });
});
