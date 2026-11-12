import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { initTestAuth, provideTestAuth } from '../../../../../../testing/auth';
import {
  type FinanceData,
  createTestFinanceGateway,
  provideTestFinances,
  testFinanceSeed,
} from '../../../../../../testing/finances';
import { provideTestI18n } from '../../../../../../testing/i18n';
import { FINANCES_ROUTES } from '../../finances.routes';

async function settle(harness: RouterTestingHarness): Promise<void> {
  for (let round = 0; round < 4; round += 1) {
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
  }
}

async function open(seed: () => FinanceData) {
  TestBed.configureTestingModule({
    imports: [provideTestI18n()],
    providers: [
      provideRouter(
        [{ path: 'app/finances', children: FINANCES_ROUTES }],
        withComponentInputBinding(),
      ),
      provideTestAuth(),
      provideTestFinances(createTestFinanceGateway(seed)),
    ],
  });
  await initTestAuth();
  const harness = await RouterTestingHarness.create('/app/finances/overview');
  await settle(harness);
  return harness.routeNativeElement as HTMLElement;
}

describe('overview page', () => {
  it('shows the month figures, the trend and the category breakdown', async () => {
    const root = await open(() => testFinanceSeed());
    const labels = Array.from(root.querySelectorAll('nx-stat-card .label')).map((label) =>
      label.textContent?.trim(),
    );

    expect(labels).toEqual(['Ingresos', 'Gastos', 'Balance', 'Tasa de ahorro']);
    expect(root.querySelectorAll('nx-bar-chart tbody tr')).toHaveLength(6);
    expect(root.querySelector('.legend li')?.textContent).toContain('Vivienda');
    expect(root.querySelectorAll('.largest li')).toHaveLength(5);
  });

  it('says the savings rate is not available without income', async () => {
    const root = await open(() => {
      const seed = testFinanceSeed();
      return {
        ...seed,
        transactions: seed.transactions.filter((transaction) => transaction.type === 'expense'),
      };
    });
    const savings = Array.from(root.querySelectorAll('nx-stat-card')).at(-1)!;

    expect(savings.querySelector('.value')?.textContent?.trim()).toBe('No disponible');
  });

  it('shows empty states when there is nothing this month', async () => {
    const root = await open(() => ({ ...testFinanceSeed(), transactions: [] }));

    expect(root.querySelector('.categories nx-empty-state')?.textContent).toContain(
      'Sin gastos este mes',
    );
  });
});
