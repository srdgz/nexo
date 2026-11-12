export type FinanceErrorCode =
  'duplicate' | 'in_use' | 'not_found' | 'invalid' | 'network' | 'unknown';

export class FinanceError extends Error {
  constructor(readonly code: FinanceErrorCode) {
    super(code);
    this.name = 'FinanceError';
  }
}

export function toFinanceError(error: unknown): FinanceError {
  return error instanceof FinanceError ? error : new FinanceError('unknown');
}
