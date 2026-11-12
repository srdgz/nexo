import type { FinanceGateway } from '../../application/finance-gateway';
import { budgetStatus } from '../../domain/budget';
import { addMonths, isoDate, monthOf } from '../../domain/month';
import { DEMO_FINANCE_KEY, createDemoFinanceGateway } from './demo-finance.gateway';
import { createFinanceSeed } from './demo-finance.seed';

const today = new Date(2026, 10, 12);
const month = monthOf(today);

function gateway(storage: Storage | null = null): FinanceGateway {
  let id = 0;
  return createDemoFinanceGateway({
    storage,
    seed: () => createFinanceSeed(today, 'es'),
    latency: [0, 0],
    newId: () => `new-${++id}`,
  });
}

describe('demo finance seed', () => {
  it.each([new Date(2026, 10, 1), new Date(2026, 10, 12), new Date(2027, 1, 28)])(
    'has data for the current month on %s',
    (day) => {
      const seed = createFinanceSeed(day, 'es');
      const current = seed.transactions.filter((transaction) =>
        transaction.date.startsWith(monthOf(day)),
      );

      expect(seed.categories).toHaveLength(12);
      expect(current.length).toBeGreaterThan(10);
      expect(current.every((transaction) => transaction.date <= isoDate(day))).toBe(true);
      expect(seed.budgets.filter((budget) => budget.month === monthOf(day))).toHaveLength(4);
    },
  );

  it('is deterministic and translated', () => {
    expect(createFinanceSeed(today, 'es')).toEqual(createFinanceSeed(today, 'es'));
    expect(createFinanceSeed(today, 'en').categories.map((category) => category.name)).toContain(
      'Groceries',
    );
  });

  it('shows budgets in different states this month', async () => {
    const finance = gateway();
    const [budgets, totals] = await Promise.all([
      finance.budgets.list(month),
      finance.insights.expensesByCategory(month),
    ]);
    const statuses = budgets.map((budget) =>
      budgetStatus(
        totals.find((total) => total.categoryId === budget.categoryId)?.total ?? 0,
        budget.amount,
      ),
    );

    expect(new Set(statuses).size).toBeGreaterThan(1);
  });
});

describe('demo finance gateway', () => {
  it('pages and filters transactions newest first', async () => {
    const finance = gateway();
    const page = await finance.transactions.list({
      month,
      type: 'expense',
      categoryId: null,
      search: '',
      page: 1,
    });

    expect(page.items.length).toBeLessThanOrEqual(20);
    expect(page.items.every((transaction) => transaction.type === 'expense')).toBe(true);
    expect(page.items[0]!.date >= page.items.at(-1)!.date).toBe(true);
  });

  it('rejects an expense with an income category', async () => {
    await expect(
      gateway().transactions.create({
        type: 'expense',
        categoryId: 'demo-category-salary',
        taskId: null,
        amount: 100,
        date: '2026-11-12',
        description: null,
      }),
    ).rejects.toMatchObject({ code: 'invalid' });
  });

  it('rejects duplicated budgets and categories', async () => {
    const finance = gateway();

    await expect(
      finance.budgets.create({ categoryId: 'demo-category-groceries', amount: 100, month }),
    ).rejects.toMatchObject({ code: 'duplicate' });
    await expect(
      finance.categories.create({ name: ' ocio ', type: 'expense', icon: 'ticket', color: 'mint' }),
    ).rejects.toMatchObject({ code: 'duplicate' });
  });

  it('refuses to delete a category that is in use but deletes an unused one', async () => {
    const finance = gateway();
    const created = await finance.categories.create({
      name: 'Mascotas',
      type: 'expense',
      icon: 'paw-print',
      color: 'mint',
    });

    await expect(finance.categories.remove('demo-category-groceries')).rejects.toMatchObject({
      code: 'in_use',
    });
    await finance.categories.remove(created.id);
    expect((await finance.categories.list()).map((category) => category.id)).not.toContain(
      created.id,
    );
  });

  it('keeps changes in the browser session', async () => {
    const storage = window.sessionStorage;
    storage.removeItem(DEMO_FINANCE_KEY);
    await gateway(storage).budgets.remove(`demo-budget-${month}-leisure`);

    const reloaded = gateway(storage);

    expect((await reloaded.budgets.list(month)).map((budget) => budget.categoryId)).not.toContain(
      'demo-category-leisure',
    );
    storage.removeItem(DEMO_FINANCE_KEY);
  });

  it('builds the trend with empty months at zero', async () => {
    const trend = await gateway().insights.trend(month, 8);

    expect(trend.map((row) => row.month)).toEqual(
      Array.from({ length: 8 }, (_, index) => addMonths(month, index - 7)),
    );
    expect(trend[0]).toEqual({ month: addMonths(month, -7), income: 0, expense: 0 });
    expect(trend.at(-1)!.income).toBeGreaterThan(0);
  });
});
