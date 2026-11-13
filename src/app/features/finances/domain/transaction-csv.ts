import { parseAmount } from '@shared/util/money';
import { type Category, type EntryType, sameCategoryName } from './category';
import {
  type Transaction,
  type TransactionDraft,
  isValidAmount,
  normalizeDescription,
} from './transaction';

export const CSV_COLUMNS = ['date', 'type', 'category', 'description', 'amount'] as const;
export type CsvColumn = (typeof CSV_COLUMNS)[number];
export const IMPORT_MAX_ROWS = 1000;

export interface CsvLabels {
  readonly headers: Readonly<Record<CsvColumn, string>>;
  readonly types: Readonly<Record<EntryType, string>>;
  readonly decimal: ',' | '.';
}

export type ImportProblem = 'date' | 'type' | 'category' | 'amount';

export interface ImportRow {
  readonly line: number;
  readonly date: string;
  readonly category: string;
  readonly description: string;
  readonly amount: number | null;
  readonly type: EntryType | null;
  readonly problems: readonly ImportProblem[];
  readonly draft: TransactionDraft | null;
}

export type ImportResult =
  | { readonly ok: true; readonly rows: readonly ImportRow[] }
  | { readonly ok: false; readonly reason: 'empty' | 'columns' | 'too_many' };

const HEADER_ALIASES: Readonly<Record<CsvColumn, readonly string[]>> = {
  date: ['fecha', 'date', 'dia', 'day'],
  type: ['tipo', 'type'],
  category: ['categoria', 'category'],
  description: ['descripcion', 'description', 'concepto', 'concept'],
  amount: ['importe', 'amount', 'cantidad', 'valor', 'value'],
};

const TYPE_ALIASES: Readonly<Record<string, EntryType>> = {
  gasto: 'expense',
  gastos: 'expense',
  expense: 'expense',
  expenses: 'expense',
  ingreso: 'income',
  ingresos: 'income',
  income: 'income',
};

function plain(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase();
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatCsvAmount(cents: number, decimal: ',' | '.'): string {
  const units = Math.trunc(cents / 100);
  return `${units}${decimal}${pad(cents % 100)}`;
}

export function transactionsToRows(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  labels: CsvLabels,
): string[][] {
  const names = new Map(categories.map((category) => [category.id, category.name]));
  return [
    CSV_COLUMNS.map((column) => labels.headers[column]),
    ...transactions.map((transaction) => [
      transaction.date,
      labels.types[transaction.type],
      names.get(transaction.categoryId) ?? '',
      transaction.description ?? '',
      formatCsvAmount(transaction.amount, labels.decimal),
    ]),
  ];
}

export function parseCsvDate(value: string): string | null {
  const text = value.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  const european = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  const parts = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : european
      ? [Number(european[3]), Number(european[2]), Number(european[1])]
      : null;
  if (!parts) {
    return null;
  }
  const [year, month, day] = parts as [number, number, number];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseSignedAmount(value: string): { cents: number; negative: boolean } | null {
  const text = value.trim().replace(/^\((.*)\)$/, '-$1');
  const negative = /^[-−]/.test(text) || /-$/.test(text);
  const cents = parseAmount(text.replace(/^[-−+]|-$/g, '').replace(/[$£]|eur$/gi, ''));
  return typeof cents === 'number' ? { cents, negative } : null;
}

function columnIndexes(header: readonly string[]): Partial<Record<CsvColumn, number>> {
  const indexes: Partial<Record<CsvColumn, number>> = {};
  header.forEach((cell, index) => {
    const name = plain(cell);
    const column = CSV_COLUMNS.find((candidate) => HEADER_ALIASES[candidate].includes(name));
    if (column && indexes[column] === undefined) {
      indexes[column] = index;
    }
  });
  return indexes;
}

function unescapeCell(value: string): string {
  return /^'[=+\-@]/.test(value) ? value.slice(1) : value;
}

function findCategory(
  categories: readonly Category[],
  name: string,
  type: EntryType,
): Category | undefined {
  const matches = categories.filter(
    (category) => category.type === type && sameCategoryName(category.name, name),
  );
  return matches.find((category) => !category.archived) ?? matches[0];
}

export function parseTransactionCsv(
  table: readonly (readonly string[])[],
  categories: readonly Category[],
): ImportResult {
  const [header, ...body] = table;
  if (!header || body.length === 0) {
    return { ok: false, reason: 'empty' };
  }
  const columns = columnIndexes(header);
  if (
    columns.date === undefined ||
    columns.amount === undefined ||
    columns.category === undefined
  ) {
    return { ok: false, reason: 'columns' };
  }
  if (body.length > IMPORT_MAX_ROWS) {
    return { ok: false, reason: 'too_many' };
  }

  const cell = (row: readonly string[], column: CsvColumn): string => {
    const index = columns[column];
    return index === undefined ? '' : unescapeCell((row[index] ?? '').trim());
  };

  const rows = body.map((row, position): ImportRow => {
    const problems: ImportProblem[] = [];
    const date = parseCsvDate(cell(row, 'date'));
    const amount = parseSignedAmount(cell(row, 'amount'));
    const typeText = plain(cell(row, 'type'));
    const type: EntryType | null =
      TYPE_ALIASES[typeText] ??
      (typeText === '' && amount && amount.cents > 0
        ? amount.negative
          ? 'expense'
          : 'income'
        : null);
    const categoryName = cell(row, 'category');
    const category =
      type && categoryName ? findCategory(categories, categoryName, type) : undefined;
    const description = cell(row, 'description');

    if (!date) {
      problems.push('date');
    }
    if (!type) {
      problems.push('type');
    }
    if (type && !category) {
      problems.push('category');
    }
    if (!amount || !isValidAmount(amount.cents)) {
      problems.push('amount');
    }

    return {
      line: position + 2,
      date: date ?? cell(row, 'date'),
      category: category?.name ?? categoryName,
      description,
      amount: amount?.cents ?? null,
      type,
      problems,
      draft:
        problems.length === 0 && date && type && category && amount
          ? {
              type,
              categoryId: category.id,
              taskId: null,
              amount: amount.cents,
              date,
              description: normalizeDescription(description),
            }
          : null,
    };
  });
  return { ok: true, rows };
}
