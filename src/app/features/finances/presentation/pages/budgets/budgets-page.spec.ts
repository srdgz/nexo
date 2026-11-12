import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ToastService } from '@shared/ui/toast/toast';
import { initTestAuth, provideTestAuth } from '../../../../../../testing/auth';
import { createTestFinanceGateway, provideTestFinances } from '../../../../../../testing/finances';
import { provideTestI18n } from '../../../../../../testing/i18n';
import type { FinanceGateway } from '../../../application/finance-gateway';
import { addMonths, monthOf } from '../../../domain/month';
import { FINANCES_ROUTES } from '../../finances.routes';

const month = monthOf(new Date());
let gateway: FinanceGateway;

async function settle(harness: RouterTestingHarness): Promise<void> {
  for (let round = 0; round < 3; round += 1) {
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
  }
}

async function open(url: string) {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
  gateway = createTestFinanceGateway();
  TestBed.configureTestingModule({
    imports: [provideTestI18n()],
    providers: [
      provideRouter(
        [{ path: 'app/finances', children: FINANCES_ROUTES }],
        withComponentInputBinding(),
      ),
      provideTestAuth(),
      provideTestFinances(gateway),
    ],
  });
  await initTestAuth();
  const harness = await RouterTestingHarness.create(url);
  await settle(harness);
  return { harness, root: () => harness.routeNativeElement as HTMLElement };
}

describe('budgets page', () => {
  it('shows the totals and one card per budget with its state', async () => {
    const { root } = await open('/app/finances/budgets');
    const names = Array.from(root().querySelectorAll('.budget .name')).map((name) =>
      name.textContent?.trim(),
    );

    expect(names).toEqual(['Alimentación', 'Ocio', 'Restaurantes', 'Transporte']);
    expect(root().querySelector('.totals')?.textContent).toContain('780,00');
    expect(root().querySelector('.budget nx-badge')?.textContent).toMatch(/\d+ %/);
  });

  it('copies last month when the month is empty', async () => {
    const next = addMonths(month, 1);
    const { harness, root } = await open(`/app/finances/budgets?month=${next}`);

    const copy = Array.from(
      root().querySelectorAll<HTMLButtonElement>('nx-empty-state button'),
    ).find((button) => button.textContent?.includes('Copiar de'))!;
    copy.click();
    await settle(harness);

    expect((await gateway.budgets.list(next)).length).toBe(4);
    expect(TestBed.inject(ToastService).toasts().at(-1)?.message).toBe(
      'Se han copiado 4 presupuestos',
    );
    expect(root().querySelectorAll('.budget').length).toBe(4);
  });

  it('only offers categories without a budget and saves a new one', async () => {
    const { harness, root } = await open('/app/finances/budgets');

    Array.from(root().querySelectorAll<HTMLButtonElement>('.toolbar button'))
      .find((button) => button.textContent?.includes('Nuevo presupuesto'))!
      .click();
    await settle(harness);
    const select = root().querySelector<HTMLSelectElement>('nx-budget-dialog select')!;
    const options = Array.from(select.options).map((option) => option.text.trim());

    expect(options).not.toContain('Alimentación');
    expect(options).toContain('Suministros');

    select.value = Array.from(select.options).find(
      (option) => option.text.trim() === 'Suministros',
    )!.value;
    select.dispatchEvent(new Event('input'));
    const amount = root().querySelector<HTMLInputElement>('nx-budget-dialog nx-money-input input')!;
    amount.value = '150';
    amount.dispatchEvent(new Event('input'));
    Array.from(root().querySelectorAll<HTMLButtonElement>('nx-budget-dialog [nx-button]'))
      .find((button) => button.textContent?.includes('Crear presupuesto'))!
      .click();
    await settle(harness);

    const budgets = await gateway.budgets.list(month);
    expect(budgets.find((budget) => budget.categoryId === 'demo-category-utilities')?.amount).toBe(
      15000,
    );
    expect(root().querySelectorAll('.budget').length).toBe(5);
  });
});
