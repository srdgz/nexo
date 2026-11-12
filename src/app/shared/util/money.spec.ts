import { formatAmount, formatMoney, parseAmount } from './money';

describe('parseAmount', () => {
  it.each([
    ['', null],
    ['   ', null],
    ['12', 1200],
    ['12,5', 1250],
    ['12.5', 1250],
    ['12,50', 1250],
    ['12.50 €', 1250],
    ['1.234,56', 123456],
    ['1,234.56', 123456],
    ['1.234', 123400],
    ['1,234', 123400],
    ['1.234.567', 123456700],
    [',5', 50],
    ['0,05', 5],
  ])('parses "%s" as %s cents', (text, cents) => {
    expect(parseAmount(text)).toBe(cents);
  });

  it.each(['abc', '12a', '-5', '1e3', ',', '.'])('rejects "%s"', (text) => {
    expect(parseAmount(text)).toBeUndefined();
  });
});

describe('formatAmount', () => {
  it('uses a comma for decimals in Spanish', () => {
    expect(formatAmount(1250, 'es')).toBe('12,50');
  });

  it('always groups thousands, also in Spanish', () => {
    expect(formatAmount(123456, 'es')).toBe('1.234,56');
  });

  it('uses a dot for decimals in English', () => {
    expect(formatAmount(123456, 'en')).toBe('1,234.56');
  });
});

describe('formatMoney', () => {
  it('places the euro sign after the amount in Spanish', () => {
    expect(formatMoney(32000, 'es')).toBe('320,00 €');
  });

  it('places the euro sign before the amount in English', () => {
    expect(formatMoney(32000, 'en')).toBe('€320.00');
  });
});
