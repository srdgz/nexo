const DEFAULT_TARGET = '/app/dashboard';

export function safeReturnUrl(value: string | null | undefined): string {
  if (!value || !value.startsWith('/app') || value.startsWith('//') || value.includes('\\')) {
    return DEFAULT_TARGET;
  }
  return value;
}

export function safeLinkTarget(value: string | null | undefined): string {
  return value === '/auth/reset-password' ? value : safeReturnUrl(value);
}
