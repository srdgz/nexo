import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ToastService } from '@shared/ui/toast/toast';
import { initTestAuth, provideTestAuth } from '../../../../../../testing/auth';
import { provideTestFinances } from '../../../../../../testing/finances';
import { provideTestI18n } from '../../../../../../testing/i18n';
import {
  createTestOrganizationGateway,
  provideTestOrganization,
} from '../../../../../../testing/organization';
import type { OrganizationGateway } from '../../../application/organization-gateway';
import { addDays, combine, localDay } from '../../../domain/calendar';
import { ORGANIZATION_ROUTES } from '../../organization.routes';
import { eventRange } from '../event-form/event-form-page';

let organization: OrganizationGateway;
const today = localDay(new Date());

async function settle(harness: RouterTestingHarness): Promise<void> {
  for (let round = 0; round < 4; round += 1) {
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
  }
}

async function open(url: string) {
  organization = createTestOrganizationGateway();
  TestBed.configureTestingModule({
    imports: [provideTestI18n()],
    providers: [
      provideRouter(
        [{ path: 'app/organization', children: ORGANIZATION_ROUTES }],
        withComponentInputBinding(),
      ),
      provideTestAuth(),
      provideTestFinances(),
      provideTestOrganization(organization),
    ],
  });
  await initTestAuth();
  const harness = await RouterTestingHarness.create(url);
  await settle(harness);
  return { harness, root: () => harness.routeNativeElement as HTMLElement };
}

const url = () => TestBed.inject(Router).url;

describe('eventRange', () => {
  it('ends all-day events at the start of the next day', () => {
    const { start, end } = eventRange({
      allDay: true,
      startDate: '2026-11-18',
      startTime: '',
      endDate: '2026-11-19',
      endTime: '',
    });
    expect(start).toEqual(combine('2026-11-18', '00:00'));
    expect(end).toEqual(combine('2026-11-20', '00:00'));
  });
});

describe('calendar page', () => {
  it('shows a six week grid with events and due tasks', async () => {
    const { root } = await open('/app/organization/calendar');
    const todayCell = root().querySelector('.cell.today')!;

    expect(root().querySelectorAll('.cell')).toHaveLength(42);
    expect(todayCell.classList).toContain('selected');
    expect(todayCell.querySelectorAll('.chip.task').length).toBe(2);
    expect(root().querySelector('.agenda')?.textContent).toContain('Llamar al fontanero');
  });

  it('selects a day and lists its agenda', async () => {
    const { harness, root } = await open('/app/organization/calendar');
    const day = addDays(today, 2);

    Array.from(root().querySelectorAll<HTMLButtonElement>('.cell'))
      .find((cell) => cell.textContent?.includes('Revisión ITV'))!
      .click();
    await settle(harness);

    expect(url()).toBe(`/app/organization/calendar?day=${day}&month=${day.slice(0, 7)}`);
    expect(root().querySelector('.agenda')?.textContent).toContain('Revisión ITV');
    expect(root().querySelector('.agenda')?.textContent).toContain('Estación ITV Norte');
  });
});

describe('event form', () => {
  function set(root: HTMLElement, selector: string, value: string, index = 0): void {
    const input = root.querySelectorAll<HTMLInputElement>(selector)[index]!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('rejects an end before the start and saves a valid event', async () => {
    const { harness, root } = await open('/app/organization/calendar/events/new?date=2026-11-19');

    set(root(), 'form input[type=text]', 'Clase de yoga');
    set(root(), 'form input[type=time]', '18:00', 0);
    set(root(), 'form input[type=time]', '17:00', 1);
    root().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle(harness);

    expect(root().querySelector('nx-field .error')?.textContent).toContain(
      'El fin debe ser posterior al inicio.',
    );

    set(root(), 'form input[type=time]', '19:00', 1);
    root().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle(harness);

    expect(url()).toBe('/app/organization/calendar?day=2026-11-19');
    expect(TestBed.inject(ToastService).toasts().at(-1)?.message).toBe('Evento creado');
    const events = await organization.events.between(
      combine('2026-11-19', '00:00'),
      combine('2026-11-20', '00:00'),
    );
    expect(events.map((event) => [event.title, event.startsAt])).toContainEqual([
      'Clase de yoga',
      combine('2026-11-19', '18:00').toISOString(),
    ]);
  });

  it('loads an event and lists the other events that day', async () => {
    const { root } = await open('/app/organization/calendar/events/demo-event-mot/edit');

    expect(root().querySelector<HTMLInputElement>('form input[type=text]')!.value).toBe(
      'Revisión ITV',
    );
    expect(root().querySelectorAll<HTMLInputElement>('form input[type=time]')[0]!.value).toBe(
      '09:30',
    );
    expect(root().querySelector<HTMLSelectElement>('form select')!.value).toBe(
      'demo-task-mechanic',
    );
  });
});

describe('calendar import and export', () => {
  function menuItem(root: HTMLElement, text: string): HTMLButtonElement {
    return Array.from(root.querySelectorAll<HTMLButtonElement>('[nx-menu-item]')).find((item) =>
      item.textContent?.includes(text),
    )!;
  }

  it('exports every event as an .ics file and imports it back without duplicates', async () => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    });
    const { harness, root } = await open('/app/organization/calendar');
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((value: Blob) => {
      blob = value;
      return 'blob:nexo';
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const events = await organization.events.all();

    menuItem(root(), 'Exportar .ics').click();
    await settle(harness);
    const ics = await blob!.text();

    expect(click).toHaveBeenCalled();
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(events.length);
    click.mockRestore();

    menuItem(root(), 'Importar .ics').click();
    await settle(harness);
    const input = root().querySelector<HTMLInputElement>(
      'nx-import-events-dialog input[type=file]',
    )!;
    const extra = [
      'BEGIN:VEVENT',
      'DTSTART;VALUE=DATE:20270105',
      'SUMMARY:Reyes en familia',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    Object.defineProperty(input, 'files', {
      value: [new File([ics.replace('END:VCALENDAR\r\n', extra)], 'agenda.ics')],
      configurable: true,
    });
    input.dispatchEvent(new Event('change'));
    await settle(harness);

    const dialog = root().querySelector('nx-import-events-dialog')!;
    expect(dialog.textContent).toContain('Eventos nuevos para importar: 1');
    expect(dialog.textContent).toContain(
      `Ya están en tu calendario y no se duplican: ${events.length}.`,
    );
    expect(dialog.textContent).toContain('Reyes en familia');

    Array.from(dialog.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Importar 1'))!
      .click();
    await settle(harness);

    expect(await organization.events.all()).toHaveLength(events.length + 1);
    expect(TestBed.inject(ToastService).toasts().at(-1)?.message).toBe('Eventos importados: 1.');
  });
});
