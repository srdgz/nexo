import { budgetStatus, budgetTotals, budgetUsage } from './budget';
import { normalizeCategoryName, sameCategoryName } from './category';
import { balanceOf, changeRatio, savingsRate, shareOf } from './insights';
import { addMonths, isIsoDate, isMonthKey, monthOf, monthRange, toMonthKey } from './month';
import {
  type Transaction,
  isValidAmount,
  matchesQuery,
  normalizeDescription,
  pageCount,
  signedAmount,
} from './transaction';

describe('months', () => {
  it('validates month keys and dates', () => {
    expect(isMonthKey('2026-11')).toBe(true);
    expect(isMonthKey('2026-13')).toBe(false);
    expect(isMonthKey('26-11')).toBe(false);
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
  });

  it('falls back to the current month', () => {
    const today = new Date(2026, 10, 12);
    expect(monthOf(today)).toBe('2026-11');
    expect(toMonthKey('2026-03', today)).toBe('2026-03');
    expect(toMonthKey('nope', today)).toBe('2026-11');
    expect(toMonthKey(undefined, today)).toBe('2026-11');
  });

  it('moves across years and knows the last day', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });
});

describe('transactions', () => {
  const base: Transaction = {
    id: 't1',
    type: 'expense',
    categoryId: 'c1',
    taskId: null,
    amount: 8640,
    date: '2026-11-11',
    description: 'Supermercado',
  };

  it('accepts positive whole cents only', () => {
    expect(isValidAmount(1)).toBe(true);
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-5)).toBe(false);
    expect(isValidAmount(10.5)).toBe(false);
    expect(isValidAmount(null)).toBe(false);
  });

  it('signs expenses and trims descriptions', () => {
    expect(signedAmount(base)).toBe(-8640);
    expect(signedAmount({ type: 'income', amount: 100 })).toBe(100);
    expect(normalizeDescription('  ')).toBeNull();
    expect(normalizeDescription(' Repsol ')).toBe('Repsol');
  });

  it('matches month, type, category and text', () => {
    const query = { month: '2026-11' as const, type: null, categoryId: null, search: '', page: 1 };
    expect(matchesQuery(base, query)).toBe(true);
    expect(matchesQuery(base, { ...query, month: '2026-10' })).toBe(false);
    expect(matchesQuery(base, { ...query, type: 'income' })).toBe(false);
    expect(matchesQuery(base, { ...query, categoryId: 'c2' })).toBe(false);
    expect(matchesQuery(base, { ...query, search: 'super' })).toBe(true);
    expect(matchesQuery(base, { ...query, search: 'farmacia' })).toBe(false);
  });

  it('counts pages', () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(20)).toBe(1);
    expect(pageCount(21)).toBe(2);
  });
});

describe('budgets', () => {
  it.each([
    [0, 40000, 'ok', 0],
    [31999, 40000, 'ok', 80],
    [32000, 40000, 'warning', 80],
    [40000, 40000, 'warning', 100],
    [40001, 40000, 'over', 100],
  ] as const)('%s of %s is %s', (spent, amount, status, usage) => {
    expect(budgetStatus(spent, amount)).toBe(status);
    expect(budgetUsage(spent, amount)).toBe(usage);
  });

  it('adds the totals', () => {
    expect(
      budgetTotals([
        { amount: 40000, spent: 29840 },
        { amount: 18000, spent: 15620 },
      ]),
    ).toEqual({ budgeted: 58000, spent: 45460, available: 12540 });
  });
});

describe('insights', () => {
  it('computes balance, savings and shares', () => {
    expect(balanceOf({ income: 345000, expense: 160770 })).toBe(184230);
    expect(savingsRate({ income: 345000, expense: 160770 })).toBe(53.4);
    expect(savingsRate({ income: 0, expense: 5000 })).toBeNull();
    expect(shareOf(85000, 160770)).toBe(52.9);
    expect(shareOf(5, 0)).toBe(0);
    expect(changeRatio(110, 100)).toBe(10);
    expect(changeRatio(5, 0)).toBeNull();
  });
});

describe('category names', () => {
  it('compares names ignoring case and spaces', () => {
    expect(normalizeCategoryName('  Casa   y  hogar ')).toBe('Casa y hogar');
    expect(sameCategoryName('ocio', ' OCIO ')).toBe(true);
  });
});
