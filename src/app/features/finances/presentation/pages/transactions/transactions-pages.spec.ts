import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ToastService } from '@shared/ui/toast/toast';
import { initTestAuth, provideTestAuth } from '../../../../../../testing/auth';
import { createTestFinanceGateway, provideTestFinances } from '../../../../../../testing/finances';
import { provideTestI18n } from '../../../../../../testing/i18n';
import type { FinanceGateway } from '../../../application/finance-gateway';
import { isoDate, monthOf } from '../../../domain/month';
import { FINANCES_ROUTES } from '../../finances.routes';

const month = monthOf(new Date());
let gateway: FinanceGateway;

async function open(url: string) {
  gateway = createTestFinanceGateway();
  TestBed.configureTestingModule({
    imports: [provideTestI18n()],
    providers: [
      provideRouter(
        [
          { path: 'app/finances', children: FINANCES_ROUTES },
          { path: '**', children: [] },
        ],
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

async function settle(harness: RouterTestingHarness): Promise<void> {
  for (let round = 0; round < 3; round += 1) {
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
  }
}

const url = () => TestBed.inject(Router).url;

describe('transactions page', () => {
  it('lists this month newest first with signed amounts', async () => {
    const { root } = await open('/app/finances/transactions');
    const rows = root().querySelectorAll('tbody tr');

    expect(rows.length).toBe(20);
    expect(root().querySelector('nx-pagination')?.textContent).toMatch(/1–20 de \d+/);
    expect(rows[0]!.querySelector('.amount')?.textContent?.trim()).toMatch(/^[−+]\d/);
  });

  it('keeps the filters in the url', async () => {
    const { harness, root } = await open('/app/finances/transactions');

    root().querySelectorAll<HTMLInputElement>('nx-segmented input')[1]!.click();
    await settle(harness);

    expect(url()).toBe('/app/finances/transactions?type=income');
    expect(
      Array.from(root().querySelectorAll('tbody .amount')).every((cell) =>
        cell.textContent?.trim().startsWith('+'),
      ),
    ).toBe(true);
  });

  it('shows an empty state with a way to clear the filters', async () => {
    const { harness, root } = await open('/app/finances/transactions?q=zzzz');

    expect(root().querySelector('nx-empty-state')?.textContent).toContain(
      'Ningún movimiento coincide',
    );
    Array.from(root().querySelectorAll<HTMLButtonElement>('nx-empty-state button'))
      .find((button) => button.textContent?.includes('Quitar filtros'))!
      .click();
    await settle(harness);

    expect(url()).toBe('/app/finances/transactions');
  });

  it('deletes a transaction after confirming', async () => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    });
    const { harness, root } = await open('/app/finances/transactions');
    const before = (
      await gateway.transactions.list({ month, type: null, categoryId: null, search: '', page: 1 })
    ).total;

    Array.from(root().querySelectorAll<HTMLButtonElement>('tbody tr:first-child [nx-menu-item]'))
      .find((item) => item.textContent?.includes('Eliminar'))!
      .click();
    await settle(harness);
    Array.from(root().querySelectorAll<HTMLButtonElement>('dialog [nx-button]'))
      .find((button) => button.textContent?.includes('Eliminar'))!
      .click();
    await settle(harness);

    const after = (
      await gateway.transactions.list({ month, type: null, categoryId: null, search: '', page: 1 })
    ).total;
    expect(after).toBe(before - 1);
    expect(TestBed.inject(ToastService).toasts().at(-1)?.message).toBe('Movimiento eliminado');
  });
});

describe('transaction form', () => {
  function fill(root: HTMLElement, amount: string, category: string): void {
    const input = root.querySelector<HTMLInputElement>('nx-money-input input')!;
    input.value = amount;
    input.dispatchEvent(new Event('input'));
    const select = root.querySelector<HTMLSelectElement>('nx-field select')!;
    select.value = Array.from(select.options).find(
      (option) => option.text.trim() === category,
    )!.value;
    select.dispatchEvent(new Event('input'));
  }

  it('only offers categories of the chosen type', async () => {
    const { harness, root } = await open('/app/finances/transactions/new?type=income');
    await settle(harness);
    const options = Array.from(
      root().querySelector('nx-field select')!.querySelectorAll('option'),
    ).map((option) => option.textContent?.trim());

    expect(options).toEqual(['Elige una categoría', 'Extras', 'Nómina']);
  });

  it('validates before saving', async () => {
    const { harness, root } = await open('/app/finances/transactions/new');

    root().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle(harness);

    expect(root().querySelectorAll('nx-field .error').length).toBe(2);
    expect(url()).toBe('/app/finances/transactions/new');
  });

  it('shows the budget impact and warns after saving', async () => {
    const { harness, root } = await open('/app/finances/transactions/new?type=expense');
    const groceries = (await gateway.budgets.list(month)).find(
      (budget) => budget.categoryId === 'demo-category-groceries',
    )!;
    const spent =
      (await gateway.insights.expensesByCategory(month)).find(
        (total) => total.categoryId === 'demo-category-groceries',
      )?.total ?? 0;
    const amount = groceries.amount - spent + 100;

    fill(root(), (amount / 100).toFixed(2).replace('.', ','), 'Alimentación');
    await settle(harness);

    expect(root().querySelector('.side')?.textContent).toContain('Te pasarías 1,00');

    root().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle(harness);

    expect(url()).toBe(`/app/finances/transactions?month=${month}`);
    expect(TestBed.inject(ToastService).toasts().at(-1)?.message).toMatch(
      /^Gasto registrado\. Has usado el \d+ % de Alimentación$/,
    );
    const saved = await gateway.transactions.list({
      month,
      type: 'expense',
      categoryId: 'demo-category-groceries',
      search: '',
      page: 1,
    });
    expect(
      saved.items.some((item) => item.amount === amount && item.date === isoDate(new Date())),
    ).toBe(true);
  });

  it('loads an existing transaction to edit it', async () => {
    const first = (
      await createTestFinanceGateway().transactions.list({
        month,
        type: 'expense',
        categoryId: null,
        search: '',
        page: 1,
      })
    ).items[0]!;
    const { harness, root } = await open(`/app/finances/transactions/${first.id}/edit`);
    await settle(harness);

    expect(root().querySelector<HTMLInputElement>('nx-money-input input')!.value).not.toBe('');
    expect(root().querySelector<HTMLSelectElement>('nx-field select')!.value).toBe(
      first.categoryId,
    );
    expect(root().textContent).toContain('Eliminar');
  });
});
