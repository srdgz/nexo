import type { DemoSync } from '@core/realtime/realtime';
import type {
  BudgetRepository,
  CategoryRepository,
  FinanceGateway,
  InsightsRepository,
  TransactionRepository,
} from '../../application/finance-gateway';
import type { Budget, BudgetDraft } from '../../domain/budget';
import { type Category, type CategoryDraft, sameCategoryName } from '../../domain/category';
import { FinanceError } from '../../domain/finance-error';
import {
  type CategoryTotal,
  type DailyTotal,
  type MonthTotals,
  type PeriodSummary,
  sumDaily,
} from '../../domain/insights';
import { type MonthKey, addMonths, monthOfDate } from '../../domain/month';
import {
  PAGE_SIZE,
  type Page,
  type Transaction,
  type TransactionDraft,
  type TransactionFilter,
  type TransactionQuery,
  compareByDateDesc,
  matchesQuery,
} from '../../domain/transaction';
import type { FinanceData } from './demo-finance.seed';

export const DEMO_FINANCE_KEY = 'nexo.demo.finances';

export interface DemoOptions {
  readonly storage: Storage | null;
  readonly sync?: DemoSync;
  readonly seed: () => FinanceData;
  readonly latency?: readonly [number, number];
  readonly newId?: () => string;
}

class DemoFinanceDb {
  private data: FinanceData;
  private saved: string | null = null;
  private readonly latency: readonly [number, number];
  readonly newId: () => string;

  constructor(private readonly options: DemoOptions) {
    this.latency = options.latency ?? [150, 300];
    this.newId = options.newId ?? (() => crypto.randomUUID());
    this.data = this.read() ?? options.seed();
    this.save();
    options.sync?.listen(DEMO_FINANCE_KEY, (data) => {
      this.data = data as FinanceData;
      this.saved = JSON.stringify(data);
    });
  }

  async run<T>(action: (data: FinanceData) => T): Promise<T> {
    const [min, max] = this.latency;
    if (max > 0) {
      await new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)));
    }
    const result = action(this.data);
    this.save();
    return structuredClone(result);
  }

  private read(): FinanceData | null {
    try {
      const raw = this.options.storage?.getItem(DEMO_FINANCE_KEY);
      return raw ? (JSON.parse(raw) as FinanceData) : null;
    } catch {
      return null;
    }
  }

  private save(): void {
    const text = JSON.stringify(this.data);
    if (text === this.saved) {
      return;
    }
    const first = this.saved === null;
    this.saved = text;
    try {
      this.options.storage?.setItem(DEMO_FINANCE_KEY, text);
    } catch {
      return;
    }
    if (!first) {
      this.options.sync?.publish(DEMO_FINANCE_KEY, this.data);
    }
  }
}

function find<T extends { id: string }>(items: T[], id: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) {
    throw new FinanceError('not_found');
  }
  return item;
}

function replace<T extends { id: string }>(items: T[], next: T): T {
  items.splice(
    items.findIndex((item) => item.id === next.id),
    1,
    next,
  );
  return next;
}

class DemoCategories implements CategoryRepository {
  constructor(private readonly db: DemoFinanceDb) {}

  list(): Promise<Category[]> {
    return this.db.run((data) => data.categories);
  }

  create(draft: CategoryDraft): Promise<Category> {
    return this.db.run((data) => {
      this.assertUnique(data, draft, null);
      const category: Category = { id: this.db.newId(), archived: false, ...draft };
      data.categories.push(category);
      return category;
    });
  }

  update(id: string, changes: Partial<CategoryDraft> & { archived?: boolean }): Promise<Category> {
    return this.db.run((data) => {
      const current = find(data.categories, id);
      const next: Category = { ...current, ...changes };
      this.assertUnique(data, next, id);
      if (next.type !== current.type && data.transactions.some((t) => t.categoryId === id)) {
        throw new FinanceError('in_use');
      }
      return replace(data.categories, next);
    });
  }

  remove(id: string): Promise<void> {
    return this.db.run((data) => {
      find(data.categories, id);
      const used =
        data.transactions.some((transaction) => transaction.categoryId === id) ||
        data.budgets.some((budget) => budget.categoryId === id);
      if (used) {
        throw new FinanceError('in_use');
      }
      data.categories = data.categories.filter((category) => category.id !== id);
    });
  }

  private assertUnique(data: FinanceData, draft: CategoryDraft, id: string | null): void {
    const clash = data.categories.some(
      (category) =>
        category.id !== id &&
        category.type === draft.type &&
        sameCategoryName(category.name, draft.name),
    );
    if (clash) {
      throw new FinanceError('duplicate');
    }
  }
}

function assertCategoryType(data: FinanceData, draft: TransactionDraft): void {
  const category = data.categories.find((candidate) => candidate.id === draft.categoryId);
  if (!category || category.type !== draft.type) {
    throw new FinanceError('invalid');
  }
}

class DemoTransactions implements TransactionRepository {
  constructor(private readonly db: DemoFinanceDb) {}

  list(query: TransactionQuery): Promise<Page<Transaction>> {
    return this.db.run((data) => {
      const matches = data.transactions
        .filter((transaction) => matchesQuery(transaction, query))
        .sort(compareByDateDesc);
      const start = (query.page - 1) * PAGE_SIZE;
      return { items: matches.slice(start, start + PAGE_SIZE), total: matches.length };
    });
  }

  listAll(filter: TransactionFilter): Promise<Transaction[]> {
    return this.db.run((data) =>
      data.transactions
        .filter((transaction) => matchesQuery(transaction, filter))
        .sort(compareByDateDesc),
    );
  }

  get(id: string): Promise<Transaction> {
    return this.db.run((data) => find(data.transactions, id));
  }

  createMany(drafts: readonly TransactionDraft[]): Promise<number> {
    return this.db.run((data) => {
      for (const draft of drafts) {
        assertCategoryType(data, draft);
      }
      data.transactions.push(...drafts.map((draft) => ({ id: this.db.newId(), ...draft })));
      return drafts.length;
    });
  }

  create(draft: TransactionDraft): Promise<Transaction> {
    return this.db.run((data) => {
      assertCategoryType(data, draft);
      const transaction: Transaction = { id: this.db.newId(), ...draft };
      data.transactions.push(transaction);
      return transaction;
    });
  }

  update(id: string, draft: TransactionDraft): Promise<Transaction> {
    return this.db.run((data) => {
      find(data.transactions, id);
      assertCategoryType(data, draft);
      return replace(data.transactions, { id, ...draft });
    });
  }

  remove(id: string): Promise<void> {
    return this.db.run((data) => {
      find(data.transactions, id);
      data.transactions = data.transactions.filter((transaction) => transaction.id !== id);
    });
  }

  countByCategory(month: MonthKey): Promise<Record<string, number>> {
    return this.db.run((data) => {
      const counts: Record<string, number> = {};
      for (const transaction of data.transactions) {
        if (monthOfDate(transaction.date) === month) {
          counts[transaction.categoryId] = (counts[transaction.categoryId] ?? 0) + 1;
        }
      }
      return counts;
    });
  }

  byTask(taskId: string): Promise<Transaction[]> {
    return this.db.run((data) =>
      data.transactions
        .filter((transaction) => transaction.taskId === taskId)
        .sort(compareByDateDesc),
    );
  }
}

class DemoBudgets implements BudgetRepository {
  constructor(private readonly db: DemoFinanceDb) {}

  list(month: MonthKey): Promise<Budget[]> {
    return this.db.run((data) => data.budgets.filter((budget) => budget.month === month));
  }

  create(draft: BudgetDraft): Promise<Budget> {
    return this.db.run((data) => {
      const category = data.categories.find((candidate) => candidate.id === draft.categoryId);
      if (!category || category.type !== 'expense') {
        throw new FinanceError('invalid');
      }
      const duplicate = data.budgets.some(
        (budget) => budget.categoryId === draft.categoryId && budget.month === draft.month,
      );
      if (duplicate) {
        throw new FinanceError('duplicate');
      }
      const budget: Budget = { id: this.db.newId(), ...draft };
      data.budgets.push(budget);
      return budget;
    });
  }

  update(id: string, amount: number): Promise<Budget> {
    return this.db.run((data) => replace(data.budgets, { ...find(data.budgets, id), amount }));
  }

  remove(id: string): Promise<void> {
    return this.db.run((data) => {
      find(data.budgets, id);
      data.budgets = data.budgets.filter((budget) => budget.id !== id);
    });
  }
}

function inMonth(data: FinanceData, month: MonthKey): Transaction[] {
  return data.transactions.filter((transaction) => monthOfDate(transaction.date) === month);
}

function totals(transactions: readonly Transaction[]): PeriodSummary {
  return transactions.reduce(
    (sum, transaction) =>
      transaction.type === 'income'
        ? { ...sum, income: sum.income + transaction.amount }
        : { ...sum, expense: sum.expense + transaction.amount },
    { income: 0, expense: 0 },
  );
}

class DemoInsights implements InsightsRepository {
  constructor(private readonly db: DemoFinanceDb) {}

  summary(month: MonthKey): Promise<PeriodSummary> {
    return this.db.run((data) => totals(inMonth(data, month)));
  }

  expensesByCategory(month: MonthKey): Promise<CategoryTotal[]> {
    return this.db.run((data) => {
      const byCategory = new Map<string, number>();
      for (const transaction of inMonth(data, month)) {
        if (transaction.type === 'expense') {
          byCategory.set(
            transaction.categoryId,
            (byCategory.get(transaction.categoryId) ?? 0) + transaction.amount,
          );
        }
      }
      return [...byCategory]
        .map(([categoryId, total]) => ({ categoryId, total }))
        .sort((a, b) => b.total - a.total || a.categoryId.localeCompare(b.categoryId));
    });
  }

  trend(lastMonth: MonthKey, months: number): Promise<MonthTotals[]> {
    return this.db.run((data) => {
      const count = Math.min(Math.max(months, 1), 24);
      return Array.from({ length: count }, (_, index) => {
        const month = addMonths(lastMonth, index - count + 1);
        return { month, ...totals(inMonth(data, month)) };
      });
    });
  }

  dailyExpenses(month: MonthKey): Promise<DailyTotal[]> {
    return this.db.run((data) =>
      sumDaily(inMonth(data, month).filter((transaction) => transaction.type === 'expense')),
    );
  }

  largestExpenses(month: MonthKey, limit: number): Promise<Transaction[]> {
    return this.db.run((data) =>
      inMonth(data, month)
        .filter((transaction) => transaction.type === 'expense')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, limit),
    );
  }
}

export function createDemoFinanceGateway(options: DemoOptions): FinanceGateway {
  const db = new DemoFinanceDb(options);
  return {
    categories: new DemoCategories(db),
    transactions: new DemoTransactions(db),
    budgets: new DemoBudgets(db),
    insights: new DemoInsights(db),
  };
}
