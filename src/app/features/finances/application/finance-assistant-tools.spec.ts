import { TestBed } from '@angular/core/testing';
import type { AssistantTool } from '@core/assistant/assistant';
import { createTestFinanceGateway, provideTestFinances } from '../../../../testing/finances';
import { provideTestI18n } from '../../../../testing/i18n';
import type { FinanceGateway } from './finance-gateway';
import { financeAssistantTools } from './finance-assistant-tools';
import { dayLabel } from '@shared/util/day-label';
import { isoDate, monthOf } from '../domain/month';

describe('finance assistant tools', () => {
  let gateway: FinanceGateway;
  let tools: AssistantTool[];

  beforeEach(() => {
    gateway = createTestFinanceGateway();
    TestBed.configureTestingModule({
      imports: [provideTestI18n()],
      providers: [provideTestFinances(gateway)],
    });
    tools = TestBed.runInInjectionContext(financeAssistantTools);
  });

  const tool = (name: string) => tools.find((item) => item.name === name)!;
  const today = isoDate(new Date());

  it('declares only the tools that change data as writing', () => {
    expect(tools.filter((item) => item.writes).map((item) => item.name)).toEqual([
      'add_transaction',
    ]);
  });

  it('describes and records an expense in the category the user named', async () => {
    const input = { type: 'expense', amount: 12.5, category: 'alimentación', description: 'Súper' };

    expect((await tool('add_transaction').describe!(input)).replace(/\s/g, ' ')).toBe(
      `Gasto de 12,50 € en Alimentación el ${dayLabel(today, 'es').replace(/\s/g, ' ')}`,
    );
    const result = await tool('add_transaction').run(input);
    const stored = await gateway.transactions.listAll({
      month: monthOf(new Date()),
      type: 'expense',
      categoryId: null,
      search: 'Súper',
    });

    expect(result).toEqual({ id: expect.any(String), date: today, amount: 12.5 });
    expect(stored.map((item) => item.amount)).toEqual([1250]);
  });

  it('explains which categories exist when the name does not match', async () => {
    await expect(
      tool('add_transaction').describe!({ type: 'income', amount: 10, category: 'Lotería' }),
    ).rejects.toThrow(/no income category called "Lotería". Available: .*Nómina/);
    await expect(
      tool('add_transaction').describe!({ type: 'expense', amount: -0.001, category: 'Ocio' }),
    ).rejects.toThrow('amount must be a positive number of euros.');
  });

  it('summarises a month in euros', async () => {
    const summary = (await tool('month_summary').run({})) as {
      month: string;
      income: number;
      expenses: number;
      balance: number;
      expensesByCategory: { category: string; amount: number }[];
    };

    expect(summary.month).toBe(monthOf(new Date()));
    expect(summary.balance).toBeCloseTo(summary.income - summary.expenses);
    expect(summary.expensesByCategory[0]?.category).toEqual(expect.any(String));
  });
});
