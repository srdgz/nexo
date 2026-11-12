import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { PageHeading } from '@core/layout/page-heading';
import { initTestAuth, provideTestAuth } from '../../../../testing/auth';
import { provideTestFinances } from '../../../../testing/finances';
import { provideTestI18n } from '../../../../testing/i18n';
import { provideTestOrganization } from '../../../../testing/organization';
import { DASHBOARD_ROUTES } from './dashboard.routes';

async function settle(harness: RouterTestingHarness): Promise<void> {
  for (let round = 0; round < 4; round += 1) {
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
  }
}

async function open() {
  TestBed.configureTestingModule({
    imports: [provideTestI18n()],
    providers: [
      provideRouter(
        [{ path: 'app/dashboard', children: DASHBOARD_ROUTES }],
        withComponentInputBinding(),
      ),
      provideTestAuth(),
      provideTestFinances(),
      provideTestOrganization(),
    ],
  });
  await initTestAuth();
  const harness = await RouterTestingHarness.create('/app/dashboard');
  await settle(harness);
  return { harness, root: harness.routeNativeElement as HTMLElement };
}

function texts(root: HTMLElement, selector: string): string[] {
  return Array.from(root.querySelectorAll(selector)).map(
    (element) => element.textContent?.trim() ?? '',
  );
}

describe('dashboard page', () => {
  it('greets the user in the header', async () => {
    await open();
    const heading = TestBed.inject(PageHeading).value();

    expect(heading?.title).toMatch(/^(Buenos días|Buenas tardes|Buenas noches), Laura$/);
    expect(heading?.subtitle).toBeTruthy();
  });

  it('shows the month balance with its income and expenses', async () => {
    const { root } = await open();

    expect(root.querySelector('.hero-amount')?.textContent).toContain('€');
    expect(root.querySelectorAll('.hero-tile')).toHaveLength(2);
    expect(root.querySelector('nx-lollipop-chart tbody tr')).not.toBeNull();
  });

  it('lists budgets, the category breakdown, payments and events', async () => {
    const { root } = await open();

    expect(root.querySelectorAll('.budgets .budget').length).toBeGreaterThan(0);
    expect(root.querySelectorAll('.budgets .budget').length).toBeLessThanOrEqual(4);
    expect(texts(root, '.categories .legend-name')).toContain('Vivienda');
    expect(texts(root, '.payments .text b')).toContain('Pagar la cuota del gimnasio');
    expect(root.querySelectorAll('.events li').length).toBeGreaterThan(0);
  });

  it('filters the pending tasks by priority', async () => {
    const { harness, root } = await open();
    const high = Array.from(root.querySelectorAll<HTMLButtonElement>('.tasks .chips button')).at(
      -1,
    )!;
    const expected = Number(high.textContent?.match(/\d+/)?.[0]);

    high.click();
    await settle(harness);

    expect(root.querySelectorAll('.tasks .stack li')).toHaveLength(expected);
    expect(texts(root, '.tasks .stack li nx-priority-badge').every((text) => text === 'Alta')).toBe(
      true,
    );
  });
});
