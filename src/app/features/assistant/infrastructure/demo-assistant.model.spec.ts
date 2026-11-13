import type { AssistantTurn, ModelRequest } from '@core/assistant/assistant';
import { DemoAssistantModel } from './demo-assistant.model';

const today = '2026-11-13';

function request(turns: AssistantTurn[]): ModelRequest {
  return { mode: 'capture', turns, tools: [], context: { today, language: 'es', weekStartsOn: 1 } };
}

describe('DemoAssistantModel', () => {
  const model = new DemoAssistantModel(
    (key, params) => `${key}${params ? ` ${JSON.stringify(params)}` : ''}`,
    (euros) => `${euros.toFixed(2)} €`,
  );

  it('records an expense in the matching category in two tool steps', async () => {
    const user: AssistantTurn = { role: 'user', text: 'Ayer gasté 23,40 € en el súper' };
    const first = await model.reply(request([user]));
    const second = await model.reply(
      request([
        user,
        { role: 'model', ...first },
        {
          role: 'tool',
          results: [
            {
              id: first.calls[0]!.id,
              name: 'list_categories',
              output: {
                result: [
                  { name: 'Restaurantes', type: 'expense' },
                  { name: 'Alimentación', type: 'expense' },
                  { name: 'Nómina', type: 'income' },
                ],
              },
            },
          ],
        },
      ]),
    );
    const third = await model.reply(
      request([
        user,
        { role: 'model', ...second },
        { role: 'tool', results: [{ id: 'x', name: 'add_transaction', output: { result: {} } }] },
      ]),
    );

    expect(first.calls[0]?.name).toBe('list_categories');
    expect(second.calls[0]).toEqual(
      expect.objectContaining({
        name: 'add_transaction',
        args: { type: 'expense', amount: 23.4, category: 'Alimentación', date: '2026-11-12' },
      }),
    );
    expect(third).toEqual({ text: 'assistant.demo.expenseDone {"amount":"23.40 €"}', calls: [] });
  });

  it('creates tasks with a relative due date and explains what it understands', async () => {
    const task = await model.reply(
      request([{ role: 'user', text: 'Recuérdame llamar al seguro mañana' }]),
    );
    const help = await model.reply(request([{ role: 'user', text: 'Hola' }]));

    expect(task.calls[0]?.args).toEqual({ title: 'Llamar al seguro', dueDate: '2026-11-14' });
    expect(help.text).toBe('assistant.demo.help');
  });

  it('acknowledges a cancelled action', async () => {
    const reply = await model.reply(
      request([
        { role: 'user', text: 'Recuérdame comprar pan' },
        { role: 'tool', results: [{ id: 'x', name: 'add_task', output: { declined: true } }] },
      ]),
    );

    expect(reply.text).toBe('assistant.demo.cancelled');
  });
});
