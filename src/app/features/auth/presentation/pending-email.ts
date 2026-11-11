const KEY = 'nexo.pendingEmail';

function store(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export function savePendingEmail(email: string): void {
  store()?.setItem(KEY, email);
}

export function readPendingEmail(): string {
  return store()?.getItem(KEY) ?? '';
}
