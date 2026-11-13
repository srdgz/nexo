import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  BudgetRepository,
  CategoryRepository,
  FinanceGateway,
  InsightsRepository,
  TransactionRepository,
} from '../../application/finance-gateway';
import type { Budget, BudgetDraft } from '../../domain/budget';
import type { Category, CategoryDraft } from '../../domain/category';
import {
  type CategoryTotal,
  type DailyTotal,
  type MonthTotals,
  type PeriodSummary,
  sumDaily,
} from '../../domain/insights';
import { type MonthKey, monthRange, monthStart } from '../../domain/month';
import {
  PAGE_SIZE,
  type Page,
  type Transaction,
  type TransactionDraft,
  type TransactionFilter,
  type TransactionQuery,
} from '../../domain/transaction';
import {
  BUDGET_COLUMNS,
  type BudgetRow,
  CATEGORY_COLUMNS,
  type CategoryRow,
  TRANSACTION_COLUMNS,
  type TransactionRow,
  escapeLike,
  fromCents,
  mapBudget,
  mapCategory,
  mapFinanceError,
  mapTransaction,
  toCents,
} from './supabase-finance.mapper';

interface Result<T> {
  data: T | null;
  error: unknown;
}

async function run<T>(query: PromiseLike<Result<T>>): Promise<T> {
  let result: Result<T>;
  try {
    result = await query;
  } catch (error) {
    throw mapFinanceError(error);
  }
  if (result.error) {
    throw mapFinanceError(result.error);
  }
  return result.data as T;
}

class SupabaseCategories implements CategoryRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<Category[]> {
    const rows = await run<CategoryRow[]>(
      this.client.from('categories').select(CATEGORY_COLUMNS).order('name'),
    );
    return rows.map(mapCategory);
  }

  async create(draft: CategoryDraft): Promise<Category> {
    const row = await run<CategoryRow>(
      this.client.from('categories').insert(draft).select(CATEGORY_COLUMNS).single(),
    );
    return mapCategory(row);
  }

  async update(
    id: string,
    changes: Partial<CategoryDraft> & { archived?: boolean },
  ): Promise<Category> {
    const { archived, ...rest } = changes;
    const patch = archived === undefined ? rest : { ...rest, is_archived: archived };
    const row = await run<CategoryRow>(
      this.client.from('categories').update(patch).eq('id', id).select(CATEGORY_COLUMNS).single(),
    );
    return mapCategory(row);
  }

  async remove(id: string): Promise<void> {
    await run(this.client.from('categories').delete().eq('id', id));
  }
}

class SupabaseTransactions implements TransactionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(query: TransactionQuery): Promise<Page<Transaction>> {
    const { from, to } = monthRange(query.month);
    let request = this.client
      .from('transactions')
      .select(TRANSACTION_COLUMNS, { count: 'exact' })
      .gte('transaction_date', from)
      .lte('transaction_date', to);
    if (query.type) {
      request = request.eq('type', query.type);
    }
    if (query.categoryId) {
      request = request.eq('category_id', query.categoryId);
    }
    if (query.search.trim()) {
      request = request.ilike('description', `%${escapeLike(query.search.trim())}%`);
    }
    const start = (query.page - 1) * PAGE_SIZE;
    let response: Awaited<typeof request>;
    try {
      response = await request
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(start, start + PAGE_SIZE - 1);
    } catch (error) {
      throw mapFinanceError(error);
    }
    if (response.error) {
      throw mapFinanceError(response.error);
    }
    const rows = (response.data ?? []) as TransactionRow[];
    return { items: rows.map(mapTransaction), total: response.count ?? rows.length };
  }

  async listAll(filter: TransactionFilter): Promise<Transaction[]> {
    const { from, to } = monthRange(filter.month);
    let request = this.client
      .from('transactions')
      .select(TRANSACTION_COLUMNS)
      .gte('transaction_date', from)
      .lte('transaction_date', to);
    if (filter.type) {
      request = request.eq('type', filter.type);
    }
    if (filter.categoryId) {
      request = request.eq('category_id', filter.categoryId);
    }
    if (filter.search.trim()) {
      request = request.ilike('description', `%${escapeLike(filter.search.trim())}%`);
    }
    const rows = await run<TransactionRow[]>(
      request
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false }),
    );
    return rows.map(mapTransaction);
  }

  async createMany(drafts: readonly TransactionDraft[]): Promise<number> {
    if (drafts.length === 0) {
      return 0;
    }
    await run(this.client.from('transactions').insert(drafts.map(toRow)));
    return drafts.length;
  }

  async get(id: string): Promise<Transaction> {
    const row = await run<TransactionRow>(
      this.client.from('transactions').select(TRANSACTION_COLUMNS).eq('id', id).single(),
    );
    return mapTransaction(row);
  }

  async create(draft: TransactionDraft): Promise<Transaction> {
    const row = await run<TransactionRow>(
      this.client.from('transactions').insert(toRow(draft)).select(TRANSACTION_COLUMNS).single(),
    );
    return mapTransaction(row);
  }

  async update(id: string, draft: TransactionDraft): Promise<Transaction> {
    const row = await run<TransactionRow>(
      this.client
        .from('transactions')
        .update(toRow(draft))
        .eq('id', id)
        .select(TRANSACTION_COLUMNS)
        .single(),
    );
    return mapTransaction(row);
  }

  async remove(id: string): Promise<void> {
    await run(this.client.from('transactions').delete().eq('id', id));
  }

  async countByCategory(month: MonthKey): Promise<Record<string, number>> {
    const { from, to } = monthRange(month);
    const rows = await run<{ category_id: string }[]>(
      this.client
        .from('transactions')
        .select('category_id')
        .gte('transaction_date', from)
        .lte('transaction_date', to),
    );
    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
    }
    return counts;
  }

  async byTask(taskId: string): Promise<Transaction[]> {
    const rows = await run<TransactionRow[]>(
      this.client
        .from('transactions')
        .select(TRANSACTION_COLUMNS)
        .eq('task_id', taskId)
        .order('transaction_date', { ascending: false }),
    );
    return rows.map(mapTransaction);
  }
}

function toRow(draft: TransactionDraft) {
  return {
    type: draft.type,
    category_id: draft.categoryId,
    task_id: draft.taskId,
    amount: fromCents(draft.amount),
    transaction_date: draft.date,
    description: draft.description,
  };
}

class SupabaseBudgets implements BudgetRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(month: MonthKey): Promise<Budget[]> {
    const rows = await run<BudgetRow[]>(
      this.client.from('budgets').select(BUDGET_COLUMNS).eq('period_start', monthStart(month)),
    );
    return rows.map(mapBudget);
  }

  async create(draft: BudgetDraft): Promise<Budget> {
    const row = await run<BudgetRow>(
      this.client
        .from('budgets')
        .insert({
          category_id: draft.categoryId,
          amount: fromCents(draft.amount),
          period_start: monthStart(draft.month),
        })
        .select(BUDGET_COLUMNS)
        .single(),
    );
    return mapBudget(row);
  }

  async update(id: string, amount: number): Promise<Budget> {
    const row = await run<BudgetRow>(
      this.client
        .from('budgets')
        .update({ amount: fromCents(amount) })
        .eq('id', id)
        .select(BUDGET_COLUMNS)
        .single(),
    );
    return mapBudget(row);
  }

  async remove(id: string): Promise<void> {
    await run(this.client.from('budgets').delete().eq('id', id));
  }
}

class SupabaseInsights implements InsightsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async summary(month: MonthKey): Promise<PeriodSummary> {
    const { from, to } = monthRange(month);
    const rows = await run<{ income: number; expense: number }[]>(
      this.client.rpc('finance_summary', { p_from: from, p_to: to }),
    );
    const row = rows[0];
    return { income: Number(row?.income ?? 0), expense: Number(row?.expense ?? 0) };
  }

  async expensesByCategory(month: MonthKey): Promise<CategoryTotal[]> {
    const { from, to } = monthRange(month);
    const rows = await run<{ category_id: string; total: number }[]>(
      this.client.rpc('expenses_by_category', { p_from: from, p_to: to }),
    );
    return rows.map((row) => ({ categoryId: row.category_id, total: Number(row.total) }));
  }

  async trend(lastMonth: MonthKey, months: number): Promise<MonthTotals[]> {
    const rows = await run<{ month: string; income: number; expense: number }[]>(
      this.client.rpc('monthly_trend', { p_last_month: monthStart(lastMonth), p_months: months }),
    );
    return rows.map((row) => ({
      month: row.month.slice(0, 7) as MonthKey,
      income: Number(row.income),
      expense: Number(row.expense),
    }));
  }

  dailyExpenses(month: MonthKey): Promise<DailyTotal[]> {
    return new SupabaseDailyExpenses(this.client).load(month);
  }

  async largestExpenses(month: MonthKey, limit: number): Promise<Transaction[]> {
    const { from, to } = monthRange(month);
    const rows = await run<TransactionRow[]>(
      this.client
        .from('transactions')
        .select(TRANSACTION_COLUMNS)
        .eq('type', 'expense')
        .gte('transaction_date', from)
        .lte('transaction_date', to)
        .order('amount', { ascending: false })
        .limit(limit),
    );
    return rows.map(mapTransaction);
  }
}

class SupabaseDailyExpenses {
  constructor(private readonly client: SupabaseClient) {}

  async load(month: MonthKey): Promise<DailyTotal[]> {
    const { from, to } = monthRange(month);
    const rows = await run<{ transaction_date: string; amount: number | string }[]>(
      this.client
        .from('transactions')
        .select('transaction_date, amount')
        .eq('type', 'expense')
        .gte('transaction_date', from)
        .lte('transaction_date', to),
    );
    return sumDaily(
      rows.map((row) => ({ date: row.transaction_date, amount: toCents(row.amount) })),
    );
  }
}

export function createSupabaseFinanceGateway(client: SupabaseClient): FinanceGateway {
  return {
    categories: new SupabaseCategories(client),
    transactions: new SupabaseTransactions(client),
    budgets: new SupabaseBudgets(client),
    insights: new SupabaseInsights(client),
  };
}
