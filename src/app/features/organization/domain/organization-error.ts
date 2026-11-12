export type OrganizationErrorCode = 'not_found' | 'invalid' | 'network' | 'unknown';

export class OrganizationError extends Error {
  constructor(readonly code: OrganizationErrorCode) {
    super(code);
    this.name = 'OrganizationError';
  }
}

export function toOrganizationError(error: unknown): OrganizationError {
  return error instanceof OrganizationError ? error : new OrganizationError('unknown');
}
