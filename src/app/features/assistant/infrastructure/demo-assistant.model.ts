import type {
  AssistantModel,
  AssistantTurn,
  ModelReply,
  ModelRequest,
  ToolResult,
} from '@core/assistant/assistant';

export type Translate = (key: string, params?: Record<string, unknown>) => string;
export type FormatMoney = (euros: number) => string;

type Intent = 'expense' | 'income' | 'task' | 'summary' | 'tasks' | 'help';

const CATEGORY_HINTS: Readonly<Record<string, readonly string[]>> = {
  'alimentacion|groceries': ['super', 'mercado', 'compra', 'grocer', 'fruta', 'food'],
  'restaurantes|eating out': [
    'cafe',
    'restaurante',
    'cena',
    'comida',
    'bar',
    'lunch',
    'dinner',
    'coffee',
  ],
  'transporte|transport': ['gasolina', 'taxi', 'metro', 'bus', 'tren', 'uber', 'fuel', 'train'],
  'ocio|leisure': ['cine', 'concierto', 'libro', 'cinema', 'book', 'game'],
  'salud|health': ['farmacia', 'medico', 'dentista', 'pharmacy', 'doctor'],
  'suministros|utilities': ['luz', 'agua', 'gas', 'internet', 'electricity', 'water'],
  'nomina|salary': ['nomina', 'sueldo', 'salary', 'payroll'],
};

function plain(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase();
}

function amountIn(text: string): number | null {
  const match = /(\d+(?:[.,]\d{1,2})?)\s*(?:€|eur|euros?)?/i.exec(text);
  return match ? Number((match[1] ?? '').replace(',', '.')) : null;
}

function intentOf(text: string): Intent {
  const value = plain(text);
  const amount = amountIn(value);
  if (amount && /(cobr|ingres|nomina|sueldo|salary|earned|received|got paid)/.test(value)) {
    return 'income';
  }
  if (amount && /(gast|pag|compr|spent|paid|bought|cost)/.test(value)) {
    return 'expense';
  }
  if (/(recuerd|recordar|anota|apunta|remind|todo|to-do)/.test(value)) {
    return 'task';
  }
  if (/(pendiente|que tengo que|tareas|my tasks|to do list)/.test(value)) {
    return 'tasks';
  }
  if (/(cuanto|resumen|balance|how much|summary)/.test(value)) {
    return 'summary';
  }
  return amount ? 'expense' : 'help';
}

function addDays(today: string, amount: number): string {
  const [year, month, day] = today.split('-').map(Number) as [number, number, number];
  const date = new Date(year, month - 1, day + amount);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function relativeDay(text: string, today: string): string | null {
  const value = plain(text);
  if (/(pasado manana|day after tomorrow)/.test(value)) {
    return addDays(today, 2);
  }
  if (/(manana|tomorrow)/.test(value)) {
    return addDays(today, 1);
  }
  if (/(ayer|yesterday)/.test(value)) {
    return addDays(today, -1);
  }
  if (/(hoy|today)/.test(value)) {
    return today;
  }
  return null;
}

function taskTitle(text: string): string {
  const cleaned = text
    .replace(
      /^(recu[eé]rdame|recordar|anota|apunta|remind me to|remind me|add a task to|todo:?)\s*/i,
      '',
    )
    .replace(/\s*(pasado mañana|mañana|hoy|tomorrow|today|day after tomorrow)\s*$/i, '')
    .replace(/^(que|to)\s+/i, '')
    .trim();
  return cleaned.charAt(0).toLocaleUpperCase() + cleaned.slice(1);
}

function pickCategory(
  text: string,
  categories: readonly { name: string; type: string }[],
  type: 'expense' | 'income',
): string | null {
  const value = plain(text);
  const own = categories.filter((category) => category.type === type);
  const named = own.find((category) => value.includes(plain(category.name)));
  if (named) {
    return named.name;
  }
  for (const [names, words] of Object.entries(CATEGORY_HINTS)) {
    if (words.some((word) => value.includes(word))) {
      const target = own.find((category) => names.split('|').includes(plain(category.name)));
      if (target) {
        return target.name;
      }
    }
  }
  const fallback = own.find((category) =>
    /^(otros|other|extras|side income)$/.test(plain(category.name)),
  );
  return (fallback ?? own[0])?.name ?? null;
}

export class DemoAssistantModel implements AssistantModel {
  private counter = 0;

  constructor(
    private readonly translate: Translate,
    private readonly money: FormatMoney,
  ) {}

  reply(request: ModelRequest): Promise<ModelReply> {
    const lastUser = request.turns
      .map((turn, index) => [turn, index] as const)
      .filter(([turn]) => turn.role === 'user')
      .at(-1);
    if (!lastUser) {
      return this.say('assistant.demo.help');
    }
    const [userTurn, index] = lastUser as [Extract<AssistantTurn, { role: 'user' }>, number];
    const results = request.turns
      .slice(index + 1)
      .flatMap((turn) => (turn.role === 'tool' ? turn.results : []));
    const last = results.at(-1);
    const text = userTurn.text;
    const intent = intentOf(text);
    const today = request.context.today;

    if (last && 'declined' in last.output) {
      return this.say('assistant.demo.cancelled');
    }
    if (last && 'error' in last.output) {
      return this.say('assistant.demo.failed');
    }

    switch (intent) {
      case 'expense':
      case 'income':
        return this.transaction(intent, text, today, last);
      case 'task':
        return last
          ? this.say('assistant.demo.taskDone', { title: taskTitle(text) })
          : this.call('add_task', {
              title: taskTitle(text),
              ...(relativeDay(text, today) ? { dueDate: relativeDay(text, today) } : {}),
            });
      case 'summary':
        return last ? this.summary(last) : this.call('month_summary', {});
      case 'tasks':
        return last ? this.tasks(last) : this.call('list_tasks', { status: 'open' });
      default:
        return this.say('assistant.demo.help');
    }
  }

  private transaction(
    type: 'expense' | 'income',
    text: string,
    today: string,
    last: ToolResult | undefined,
  ): Promise<ModelReply> {
    const amount = amountIn(text) ?? 0;
    if (!last) {
      return this.call('list_categories', {});
    }
    if (last.name === 'list_categories') {
      const categories = (last.output['result'] ?? []) as { name: string; type: string }[];
      return this.call('add_transaction', {
        type,
        amount,
        category: pickCategory(text, categories, type) ?? '',
        date: relativeDay(text, today) ?? today,
      });
    }
    return this.say(
      type === 'expense' ? 'assistant.demo.expenseDone' : 'assistant.demo.incomeDone',
      {
        amount: this.money(amount),
      },
    );
  }

  private summary(last: ToolResult): Promise<ModelReply> {
    const data = (last.output['result'] ?? {}) as {
      income?: number;
      expenses?: number;
      balance?: number;
    };
    return this.say('assistant.demo.summary', {
      income: this.money(data.income ?? 0),
      expenses: this.money(data.expenses ?? 0),
      balance: this.money(data.balance ?? 0),
    });
  }

  private tasks(last: ToolResult): Promise<ModelReply> {
    const data = (last.output['result'] ?? {}) as { total?: number; items?: { title: string }[] };
    const titles = (data.items ?? []).slice(0, 5).map((item) => `• ${item.title}`);
    return titles.length
      ? this.say('assistant.demo.tasks', {
          count: data.total ?? titles.length,
          list: titles.join('\n'),
        })
      : this.say('assistant.demo.noTasks');
  }

  private call(name: string, args: Record<string, unknown>): Promise<ModelReply> {
    this.counter += 1;
    return Promise.resolve({ text: '', calls: [{ id: `demo-${this.counter}`, name, args }] });
  }

  private say(key: string, params?: Record<string, unknown>): Promise<ModelReply> {
    return Promise.resolve({ text: this.translate(key, params), calls: [] });
  }
}
