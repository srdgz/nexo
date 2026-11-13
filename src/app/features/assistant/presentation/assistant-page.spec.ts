import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  ASSISTANT_MODEL_LOADER,
  ASSISTANT_TOOLS,
  AssistantError,
  type AssistantTool,
  type ModelReply,
  type ModelRequest,
} from '@core/assistant/assistant';
import { initTestAuth, provideTestAuth } from '../../../../testing/auth';
import { provideTestI18n } from '../../../../testing/i18n';
import { ASSISTANT_ROUTES } from './assistant.routes';

let saved: unknown[];
let requests: ModelRequest[];

const addThing: AssistantTool = {
  name: 'add_thing',
  description: 'Adds a thing',
  parameters: { type: 'object', properties: {} },
  writes: true,
  describe: () => Promise.resolve('Gasto de 12,00 € en Ocio'),
  run: (input) => {
    saved.push(input);
    return Promise.resolve({ ok: true });
  },
};

async function settle(harness: RouterTestingHarness): Promise<void> {
  for (let round = 0; round < 4; round += 1) {
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
  }
}

async function open(url: string, replies: (ModelReply | Error)[]) {
  saved = [];
  requests = [];
  const queue = [...replies];
  TestBed.configureTestingModule({
    imports: [provideTestI18n()],
    providers: [
      provideRouter(
        [
          { path: 'app/assistant', children: ASSISTANT_ROUTES },
          { path: '**', children: [] },
        ],
        withComponentInputBinding(),
      ),
      provideTestAuth(),
      { provide: ASSISTANT_TOOLS, multi: true, useValue: [addThing] },
      {
        provide: ASSISTANT_MODEL_LOADER,
        useValue: () =>
          Promise.resolve({
            reply: (request: ModelRequest) => {
              requests.push(request);
              const next = queue.shift();
              return next instanceof Error
                ? Promise.reject(next)
                : Promise.resolve(next ?? { text: 'Fin.', calls: [] });
            },
          }),
      },
    ],
  });
  await initTestAuth();
  const harness = await RouterTestingHarness.create(url);
  await settle(harness);
  return { harness, root: () => harness.routeNativeElement as HTMLElement };
}

async function write(harness: RouterTestingHarness, root: HTMLElement, text: string) {
  const field = root.querySelector<HTMLTextAreaElement>('textarea')!;
  field.value = text;
  field.dispatchEvent(new Event('input'));
  await settle(harness);
  root.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
  await settle(harness);
}

function button(root: HTMLElement, text: string): HTMLButtonElement {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
    (item) => item.textContent?.trim() === text,
  )!;
}

const toolCall: ModelReply = { text: '', calls: [{ id: 'c1', name: 'add_thing', args: { a: 1 } }] };

describe('assistant page', () => {
  it('shows what it will save and saves it only after confirming', async () => {
    const { harness, root } = await open('/app/assistant?mode=capture', [
      toolCall,
      { text: 'Apuntado.', calls: [] },
    ]);

    await write(harness, root(), 'Gasté 12 € en el cine');

    expect(root().querySelector('.bubble.user')?.textContent).toBe('Gasté 12 € en el cine');
    expect(root().querySelector('.confirm')?.textContent).toContain('Gasto de 12,00 € en Ocio');
    expect(saved).toEqual([]);

    button(root(), 'Guardar').click();
    await settle(harness);

    expect(saved).toEqual([{ a: 1 }]);
    expect(requests[0]?.mode).toBe('capture');
    expect(root().querySelector('.action')?.textContent).toContain('Guardado: Gasto de 12,00 €');
    expect(root().querySelector('.bubble.assistant')?.textContent).toBe('Apuntado.');
  });

  it('keeps the history in chat mode and records a cancelled action', async () => {
    const { harness, root } = await open('/app/assistant', [
      { text: 'Hola, ¿en qué te ayudo?', calls: [] },
      toolCall,
      { text: 'Vale, no guardo nada.', calls: [] },
    ]);

    await write(harness, root(), 'Hola');
    await write(harness, root(), 'Apunta un gasto');
    button(root(), 'Cancelar').click();
    await settle(harness);

    expect(requests[1]?.turns[0]).toEqual({ role: 'user', text: 'Hola' });
    expect(saved).toEqual([]);
    expect(root().querySelector('.action.cancelled')?.textContent).toContain('Cancelado');
    expect(root().querySelectorAll('.bubble')).toHaveLength(4);
  });

  it('explains when the assistant hit its usage limit', async () => {
    const { harness, root } = await open('/app/assistant', [new AssistantError('rate_limited')]);

    await write(harness, root(), '¿Cuánto he gastado?');

    expect(root().querySelector('nx-alert')?.textContent).toContain(
      'Se ha alcanzado el límite de uso del asistente.',
    );
  });
});
