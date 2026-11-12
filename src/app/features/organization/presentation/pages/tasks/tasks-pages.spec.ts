import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FINANCES_ROUTES } from '@features/finances/presentation/finances.routes';
import { ToastService } from '@shared/ui/toast/toast';
import { initTestAuth, provideTestAuth } from '../../../../../../testing/auth';
import { createTestFinanceGateway, provideTestFinances } from '../../../../../../testing/finances';
import { provideTestI18n } from '../../../../../../testing/i18n';
import {
  createTestOrganizationGateway,
  provideTestOrganization,
} from '../../../../../../testing/organization';
import type { FinanceGateway } from '@features/finances/application/finance-gateway';
import type { OrganizationGateway } from '../../../application/organization-gateway';
import { ORGANIZATION_ROUTES } from '../../organization.routes';

let finance: FinanceGateway;
let organization: OrganizationGateway;

async function settle(harness: RouterTestingHarness): Promise<void> {
  for (let round = 0; round < 4; round += 1) {
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
  finance = createTestFinanceGateway();
  organization = createTestOrganizationGateway();
  TestBed.configureTestingModule({
    imports: [provideTestI18n()],
    providers: [
      provideRouter(
        [
          { path: 'app/organization', children: ORGANIZATION_ROUTES },
          { path: 'app/finances', children: FINANCES_ROUTES },
        ],
        withComponentInputBinding(),
      ),
      provideTestAuth(),
      provideTestFinances(finance),
      provideTestOrganization(organization),
    ],
  });
  await initTestAuth();
  const harness = await RouterTestingHarness.create(url);
  await settle(harness);
  return { harness, root: () => harness.routeNativeElement as HTMLElement };
}

const url = () => TestBed.inject(Router).url;
const button = (root: HTMLElement, selector: string, text: string) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>(selector)).find((item) =>
    item.textContent?.includes(text),
  )!;

describe('tasks page', () => {
  it('groups open tasks by due date with the overdue ones first', async () => {
    const { root } = await open('/app/organization/tasks');
    const labels = Array.from(root().querySelectorAll('.group-label')).map((label) =>
      label.textContent?.trim(),
    );

    expect(labels).toEqual([
      'Vencidas · 1',
      'Hoy · 2',
      'Esta semana · 1',
      'Más adelante · 3',
      'Sin fecha · 1',
    ]);
    expect(root().querySelector('.overdue .late')?.textContent).toContain('Venció el');
  });

  it('filters by status and priority through the url', async () => {
    const { harness, root } = await open('/app/organization/tasks');

    button(root(), '.toolbar [nx-chip]', 'Alta').click();
    await settle(harness);

    expect(url()).toBe('/app/organization/tasks?priority=high');
    expect(root().querySelectorAll('.row')).toHaveLength(3);

    button(root(), '.toolbar [nx-chip]', 'Completadas').click();
    await settle(harness);

    expect(url()).toBe('/app/organization/tasks?priority=high&status=completed');
    expect(root().querySelector('nx-empty-state')).not.toBeNull();
  });

  it('completes a task without a planned payment with a toast', async () => {
    const { harness, root } = await open('/app/organization/tasks');

    root()
      .querySelector<HTMLButtonElement>('[aria-label="Completar «Llamar al fontanero»"]')!
      .click();
    await settle(harness);

    expect((await organization.tasks.get('demo-task-plumber')).status).toBe('completed');
    expect(TestBed.inject(ToastService).toasts().at(-1)?.message).toBe('Tarea completada');
  });

  it('offers to record the planned payment and opens a linked expense', async () => {
    const { harness, root } = await open('/app/organization/tasks');

    root()
      .querySelector<HTMLButtonElement>('[aria-label="Completar «Pagar el seguro del coche»"]')!
      .click();
    await settle(harness);

    const dialog = root().querySelector('nx-task-payment-prompt dialog')!;
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.textContent).toContain('¿Registrar el pago de 449,90');
    expect(dialog.textContent).toContain('Seguros');

    button(root(), 'nx-task-payment-prompt [nx-button]', 'Registrar el pago').click();
    await settle(harness);

    expect(url()).toContain('/app/finances/transactions/new?type=expense&task=demo-task-insurance');
    expect(root().querySelector<HTMLInputElement>('nx-money-input input')!.value).toBe('449,90');
    const selects = root().querySelectorAll<HTMLSelectElement>('nx-field select');
    expect(selects[0]!.value).toBe('demo-category-insurance');
    expect(selects[1]!.value).toBe('demo-task-insurance');

    root().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle(harness);

    expect(url()).toBe('/app/organization/tasks');
    const linked = await finance.transactions.byTask('demo-task-insurance');
    expect(linked.map((item) => item.amount)).toEqual([44990]);
  });

  it('does not ask again when the task already has a payment', async () => {
    const { harness, root } = await open('/app/organization/tasks');
    await finance.transactions.create({
      type: 'expense',
      categoryId: 'demo-category-insurance',
      taskId: 'demo-task-insurance',
      amount: 44990,
      date: '2026-11-12',
      description: null,
    });

    root()
      .querySelector<HTMLButtonElement>('[aria-label="Completar «Pagar el seguro del coche»"]')!
      .click();
    await settle(harness);

    expect(root().querySelector('nx-task-payment-prompt dialog')!.hasAttribute('open')).toBe(false);
    expect(TestBed.inject(ToastService).toasts().at(-1)?.message).toBe('Tarea completada');
  });
});

describe('task form', () => {
  it('requires the amount and category when the planned payment is on', async () => {
    const { harness, root } = await open('/app/organization/tasks/new');
    const title = root().querySelector<HTMLInputElement>('nx-field input')!;
    title.value = 'Pagar la ITV';
    title.dispatchEvent(new Event('input'));
    root().querySelector<HTMLInputElement>('input[role=switch]')!.click();
    await settle(harness);

    root().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle(harness);

    expect(root().querySelectorAll('.plan .error').length).toBe(2);

    const amount = root().querySelector<HTMLInputElement>('.plan nx-money-input input')!;
    amount.value = '45';
    amount.dispatchEvent(new Event('input'));
    const category = root().querySelector<HTMLSelectElement>('.plan select')!;
    category.value = 'demo-category-transport';
    category.dispatchEvent(new Event('input'));
    root().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle(harness);

    expect(url()).toBe('/app/organization/tasks');
    const created = (await organization.tasks.list()).find((task) => task.title === 'Pagar la ITV');
    expect(created?.planned).toEqual({ amount: 4500, categoryId: 'demo-category-transport' });
  });

  it('prefills the due date from the calendar', async () => {
    const { root } = await open('/app/organization/tasks/new?date=2026-12-03');

    expect(root().querySelector<HTMLInputElement>('input[type=date]')!.value).toBe('2026-12-03');
  });
});
