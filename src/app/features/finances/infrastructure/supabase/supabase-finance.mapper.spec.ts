import { FinanceError } from '../../domain/finance-error';
import {
  escapeLike,
  fromCents,
  mapBudget,
  mapCategory,
  mapFinanceError,
  mapTransaction,
  toCents,
} from './supabase-finance.mapper';

describe('supabase finance mapper', () => {
  it('converts amounts between euros and cents without float errors', () => {
    expect(toCents('86.40')).toBe(8640);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(fromCents(8640)).toBe('86.40');
  });

  it('maps rows to the domain', () => {
    expect(
      mapTransaction({
        id: 't1',
        type: 'expense',
        category_id: 'c1',
        task_id: null,
        amount: '58.30',
        transaction_date: '2026-11-11',
        description: 'Gasolinera',
      }),
    ).toEqual({
      id: 't1',
      type: 'expense',
      categoryId: 'c1',
      taskId: null,
      amount: 5830,
      date: '2026-11-11',
      description: 'Gasolinera',
    });
    expect(
      mapBudget({ id: 'b1', category_id: 'c1', amount: 400, period_start: '2026-11-01' }),
    ).toEqual({ id: 'b1', categoryId: 'c1', amount: 40000, month: '2026-11' });
    expect(
      mapCategory({
        id: 'c1',
        name: 'Ocio',
        type: 'expense',
        icon: 'ticket',
        color: 'neon',
        is_archived: false,
      }).color,
    ).toBe('sand');
  });

  it.each([
    [{ code: '23505' }, 'duplicate'],
    [{ code: '23503' }, 'in_use'],
    [{ code: '23001' }, 'in_use'],
    [{ code: '23514' }, 'invalid'],
    [{ code: 'PGRST116' }, 'not_found'],
    [new TypeError('Failed to fetch'), 'network'],
    [{ message: 'TypeError: NetworkError when attempting to fetch resource.' }, 'network'],
    [{ code: '42501' }, 'unknown'],
  ])('maps %o to %s', (error, code) => {
    expect(mapFinanceError(error).code).toBe(code);
  });

  it('keeps domain errors and escapes like patterns', () => {
    const error = new FinanceError('not_found');
    expect(mapFinanceError(error)).toBe(error);
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });
});
