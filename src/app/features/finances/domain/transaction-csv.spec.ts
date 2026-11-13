import type { Category } from './category';
import {
  type CsvLabels,
  parseCsvDate,
  parseTransactionCsv,
  transactionsToRows,
} from './transaction-csv';

const categories: Category[] = [
  {
    id: 'food',
    name: 'Supermercado',
    type: 'expense',
    icon: 'shopping-cart',
    color: 'sage',
    archived: false,
  },
  {
    id: 'salary',
    name: 'Nómina',
    type: 'income',
    icon: 'briefcase',
    color: 'mint',
    archived: false,
  },
];

const spanish: CsvLabels = {
  headers: {
    date: 'Fecha',
    type: 'Tipo',
    category: 'Categoría',
    description: 'Descripción',
    amount: 'Importe',
  },
  types: { income: 'Ingreso', expense: 'Gasto' },
  decimal: ',',
};

describe('transactionsToRows', () => {
  it('writes one row per movement with headers and amounts in the active language', () => {
    expect(
      transactionsToRows(
        [
          {
            id: 't1',
            type: 'expense',
            categoryId: 'food',
            taskId: null,
            amount: 123456,
            date: '2026-11-02',
            description: 'Compra semanal',
          },
          {
            id: 't2',
            type: 'income',
            categoryId: 'salary',
            taskId: null,
            amount: 5,
            date: '2026-11-01',
            description: null,
          },
        ],
        categories,
        spanish,
      ),
    ).toEqual([
      ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Importe'],
      ['2026-11-02', 'Gasto', 'Supermercado', 'Compra semanal', '1234,56'],
      ['2026-11-01', 'Ingreso', 'Nómina', '', '0,05'],
    ]);
  });
});

describe('parseCsvDate', () => {
  it.each([
    ['2026-11-02', '2026-11-02'],
    ['2/11/2026', '2026-11-02'],
    ['02.11.2026', '2026-11-02'],
    ['31/02/2026', null],
    ['11/2026', null],
  ])('%s → %s', (text, expected) => {
    expect(parseCsvDate(text)).toBe(expected);
  });
});

describe('parseTransactionCsv', () => {
  it('reads Spanish or English headers in any order and matches categories by name and type', () => {
    const result = parseTransactionCsv(
      [
        ['Amount', 'Date', 'Category', 'Type', 'Description'],
        ['1.234,56', '02/11/2026', 'supermercado', 'expense', 'Compra'],
        ['2000', '2026-11-01', 'NÓMINA', 'Ingreso', ''],
      ],
      categories,
    );

    expect(result.ok && result.rows.map((row) => row.draft)).toEqual([
      {
        type: 'expense',
        categoryId: 'food',
        taskId: null,
        amount: 123456,
        date: '2026-11-02',
        description: 'Compra',
      },
      {
        type: 'income',
        categoryId: 'salary',
        taskId: null,
        amount: 200000,
        date: '2026-11-01',
        description: null,
      },
    ]);
  });

  it('takes the type from the sign when there is no type column', () => {
    const result = parseTransactionCsv(
      [
        ['Fecha', 'Categoría', 'Importe'],
        ['2026-11-02', 'Supermercado', '-12,50 €'],
        ['2026-11-01', 'Nómina', '1500,00'],
      ],
      categories,
    );

    expect(result.ok && result.rows.map((row) => [row.type, row.amount])).toEqual([
      ['expense', 1250],
      ['income', 150000],
    ]);
  });

  it('reports every problem of a row with its line number', () => {
    const result = parseTransactionCsv(
      [
        ['Fecha', 'Tipo', 'Categoría', 'Importe'],
        ['2026-11-02', 'Gasto', 'Supermercado', '10'],
        ['31/02/2026', 'Gasto', 'Viajes', 'diez'],
        ['2026-11-03', 'Otro', 'Supermercado', '0'],
      ],
      categories,
    );

    expect(result.ok && result.rows.map((row) => [row.line, row.problems])).toEqual([
      [2, []],
      [3, ['date', 'category', 'amount']],
      [4, ['type', 'amount']],
    ]);
  });

  it('rejects files without data or without the required columns', () => {
    expect(parseTransactionCsv([['Fecha', 'Importe']], categories)).toEqual({
      ok: false,
      reason: 'empty',
    });
    expect(
      parseTransactionCsv(
        [
          ['Nombre', 'Importe'],
          ['x', '1'],
        ],
        categories,
      ),
    ).toEqual({
      ok: false,
      reason: 'columns',
    });
  });
});
