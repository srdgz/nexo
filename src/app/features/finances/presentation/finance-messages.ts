import type { FinanceErrorCode } from '../domain/finance-error';

const MESSAGE_KEYS: Readonly<Record<FinanceErrorCode, string>> = {
  duplicate: 'finances.errors.duplicate',
  in_use: 'finances.errors.inUse',
  not_found: 'finances.errors.notFound',
  invalid: 'finances.errors.invalid',
  network: 'finances.errors.network',
  unknown: 'finances.errors.unknown',
};

export function financeMessageKey(code: FinanceErrorCode): string {
  return MESSAGE_KEYS[code];
}
