import { TestBed } from '@angular/core/testing';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { provideTestI18n } from '../../../../testing/i18n';
import { LanguageService } from '../../i18n/language.service';
import { TranslatedTitleStrategy } from '../../i18n/translated-title.strategy';
import { CurrentUserStore } from '../../session/current-user';
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
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [provideTestI18n()],
      providers: [
        provideRouter(routes),
        { provide: TitleStrategy, useExisting: TranslatedTitleStrategy },
      ],
    });
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

  it('shows the user card only when there is a user', async () => {
    const harness = await RouterTestingHarness.create('/app/dashboard');
    const root = harness.routeNativeElement!;
    expect(root.querySelector('nx-sidebar .user')).toBeNull();

    TestBed.inject(CurrentUserStore).set({
      displayName: 'Laura Martín',
      email: 'laura@example.com',
      avatarUrl: null,
    });
    harness.detectChanges();

    expect(root.querySelector('nx-sidebar .user-name')?.textContent).toBe('Laura Martín');
    expect(root.querySelector('nx-app-header nx-avatar')?.textContent?.trim()).toBe('LM');
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
