import { inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import {
  type AssistantTool,
  type ToolInput,
  ToolInputError,
  number,
  text,
} from '@core/assistant/assistant';
import { dayLabel } from '@shared/util/day-label';
import { formatMoney } from '@shared/util/money';
import { type Category, type EntryType, sameCategoryName } from '../domain/category';
import { type MonthKey, isIsoDate, isMonthKey, isoDate, monthOf } from '../domain/month';
import { MAX_AMOUNT_CENTS, type TransactionDraft } from '../domain/transaction';
import { FinanceService } from './finance.service';

const LIST_LIMIT = 50;

function entryType(input: ToolInput, key = 'type'): EntryType | null {
  const value = input[key];
  return value === 'income' || value === 'expense' ? value : null;
}

function month(input: ToolInput): MonthKey {
  const value = input['month'];
  return isMonthKey(value) ? value : monthOf(new Date());
}

function euros(cents: number): number {
  return cents / 100;
}

export function financeAssistantTools(): AssistantTool[] {
  const finance = inject(FinanceService);
  const transloco = inject(TranslocoService);

  const categoryName = (categories: readonly Category[], id: string) =>
    categories.find((category) => category.id === id)?.name ?? '';

  function findCategory(categories: readonly Category[], name: string, type: EntryType): Category {
    const matches = categories.filter(
      (category) => category.type === type && sameCategoryName(category.name, name),
    );
    const found = matches.find((category) => !category.archived) ?? matches[0];
    if (!found) {
      const available = categories
        .filter((category) => category.type === type && !category.archived)
        .map((category) => category.name)
        .join(', ');
      throw new ToolInputError(
        `There is no ${type} category called "${name}". Available: ${available}.`,
      );
    }
    return found;
  }

  async function transactionDraft(input: ToolInput): Promise<{
    draft: TransactionDraft;
    category: Category;
  }> {
    const type = entryType(input);
    const amount = number(input, 'amount');
    const name = text(input, 'category');
    const date = text(input, 'date') ?? isoDate(new Date());
    if (!type) {
      throw new ToolInputError('type must be "income" or "expense".');
    }
    const cents = amount === null ? null : Math.round(Math.abs(amount) * 100);
    if (!cents || cents > MAX_AMOUNT_CENTS) {
      throw new ToolInputError('amount must be a positive number of euros.');
    }
    if (!name) {
      throw new ToolInputError('category is required. Call list_categories to see the names.');
    }
    if (!isIsoDate(date)) {
      throw new ToolInputError('date must be YYYY-MM-DD.');
    }
    const category = findCategory(await finance.categories(), name, type);
    return {
      category,
      draft: {
        type,
        categoryId: category.id,
        taskId: null,
        amount: cents,
        date,
        description: text(input, 'description'),
      },
    };
  }

  return [
    {
      name: 'list_categories',
      description: 'Lists the user’s active income and expense categories.',
      parameters: { type: 'object', properties: {} },
      writes: false,
      run: async () =>
        (await finance.categories())
          .filter((category) => !category.archived)
          .map(({ name, type }) => ({ name, type })),
    },
    {
      name: 'add_transaction',
      description:
        'Records an expense or an income. The category must be one of the user’s categories of the same type.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['expense', 'income'] },
          amount: { type: 'number', description: 'Positive amount in euros, e.g. 12.5' },
          category: { type: 'string', description: 'Exact category name' },
          date: { type: 'string', description: 'YYYY-MM-DD. Defaults to today.' },
          description: { type: 'string', description: 'Short note, e.g. the shop' },
        },
        required: ['type', 'amount', 'category'],
      },
      writes: true,
      describe: async (input) => {
        const { draft, category } = await transactionDraft(input);
        return transloco.translate(
          draft.type === 'expense' ? 'assistant.actions.addExpense' : 'assistant.actions.addIncome',
          {
            amount: formatMoney(draft.amount, transloco.getActiveLang()),
            category: category.name,
            date: dayLabel(draft.date, transloco.getActiveLang()),
          },
        );
      },
      run: async (input) => {
        const { draft } = await transactionDraft(input);
        const saved = await finance.saveTransaction(null, draft);
        return { id: saved.id, date: saved.date, amount: euros(saved.amount) };
      },
    },
    {
      name: 'list_transactions',
      description: `Lists up to ${LIST_LIMIT} transactions of a month, newest first.`,
      parameters: {
        type: 'object',
        properties: {
          month: { type: 'string', description: 'YYYY-MM. Defaults to this month.' },
          type: { type: 'string', enum: ['expense', 'income'] },
          search: { type: 'string', description: 'Text to look for in the description' },
        },
      },
      writes: false,
      run: async (input) => {
        const [items, categories] = await Promise.all([
          finance.allTransactions({
            month: month(input),
            type: entryType(input),
            categoryId: null,
            search: text(input, 'search') ?? '',
          }),
          finance.categories(),
        ]);
        return {
          total: items.length,
          items: items.slice(0, LIST_LIMIT).map((item) => ({
            date: item.date,
            type: item.type,
            category: categoryName(categories, item.categoryId),
            description: item.description,
            amount: euros(item.amount),
          })),
        };
      },
    },
    {
      name: 'month_summary',
      description: 'Income, expenses, balance and spending per category for a month, in euros.',
      parameters: {
        type: 'object',
        properties: { month: { type: 'string', description: 'YYYY-MM. Defaults to this month.' } },
      },
      writes: false,
      run: async (input) => {
        const key = month(input);
        const [summary, byCategory, categories] = await Promise.all([
          finance.summary(key),
          finance.expensesByCategory(key),
          finance.categories(),
        ]);
        return {
          month: key,
          income: euros(summary.income),
          expenses: euros(summary.expense),
          balance: euros(summary.income - summary.expense),
          expensesByCategory: byCategory.map((row) => ({
            category: categoryName(categories, row.categoryId),
            amount: euros(row.total),
          })),
        };
      },
    },
    {
      name: 'budget_status',
      description: 'Budgets of a month with the amount spent so far, in euros.',
      parameters: {
        type: 'object',
        properties: { month: { type: 'string', description: 'YYYY-MM. Defaults to this month.' } },
      },
      writes: false,
      run: async (input) => {
        const [rows, categories] = await Promise.all([
          finance.budgets(month(input)),
          finance.categories(),
        ]);
        return rows.map(({ budget, spent }) => ({
          category: categoryName(categories, budget.categoryId),
          budget: euros(budget.amount),
          spent: euros(spent),
          left: euros(budget.amount - spent),
        }));
      },
    },
  ];
}
