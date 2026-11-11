import { localeFor } from './active-language';

const ALLOWED = /^[\d.,]+$/;

export function formatAmount(cents: number, language: string): string {
  return new Intl.NumberFormat(localeFor(language), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatMoney(cents: number, language: string): string {
  return new Intl.NumberFormat(localeFor(language), {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

export function parseAmount(text: string): number | null | undefined {
  const clean = text.replace(/[\s€]/g, '');
  if (clean === '') {
    return null;
  }
  if (!ALLOWED.test(clean)) {
    return undefined;
  }

  const lastSeparator = Math.max(clean.lastIndexOf(','), clean.lastIndexOf('.'));
  const decimals = lastSeparator === -1 ? '' : clean.slice(lastSeparator + 1);
  const hasDecimals = lastSeparator !== -1 && decimals.length > 0 && decimals.length <= 2;

  const integerPart = (hasDecimals ? clean.slice(0, lastSeparator) : clean).replace(/[.,]/g, '');
  const decimalPart = hasDecimals ? decimals.padEnd(2, '0') : '00';

  if (integerPart === '' && !hasDecimals) {
    return undefined;
  }

  const cents = Number(integerPart || '0') * 100 + Number(decimalPart);
  return Number.isSafeInteger(cents) ? cents : undefined;
}
