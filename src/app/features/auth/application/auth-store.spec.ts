import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { APP_MODE, RELOAD } from '@core/app-mode/app-mode';
import { ToastService } from '@shared/ui/toast/toast';
import { FakeAuthRepository, TEST_USER, provideTestAuth } from '../../../../testing/auth';
import { provideTestI18n } from '../../../../testing/i18n';
import { AuthStore } from './auth-store';

describe('AuthStore', () => {
  let repository: FakeAuthRepository;
  let store: AuthStore;

  function setup(user = TEST_USER as typeof TEST_USER | null, extra: unknown[] = []) {
    repository = new FakeAuthRepository(user);
    TestBed.configureTestingModule({
      imports: [provideTestI18n()],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideTestAuth(repository),
        ...(extra as []),
      ],
    });
    store = TestBed.inject(AuthStore);
  }

  it('starts unknown and resolves the current user on init', async () => {
    setup();
    expect(store.status()).toBe('unknown');

    await store.init();

    expect(store.status()).toBe('authenticated');
    expect(store.user()).toEqual({
      displayName: 'Laura Martín',
      email: 'laura@example.com',
      avatarUrl: null,
    });
  });

  it('signs in with a trimmed email', async () => {
    setup(null);
    await store.init();

    await store.signIn('  ana@example.com ', 'nexo2026');

    expect(repository.calls[0]).toEqual({
      method: 'signIn',
      args: ['ana@example.com', 'nexo2026'],
    });
    expect(store.isAuthenticated()).toBe(true);
  });

  it('builds callback links that point back to the app', async () => {
    setup(null);
    await store.init();
    const origin = TestBed.inject(DOCUMENT).location.origin;

    await store.requestPasswordReset('ana@example.com');

    expect(repository.calls[0]?.args[1]).toBe(
      `${origin}/auth/callback?next=%2Fauth%2Freset-password`,
    );
  });

  it('signs out and goes to the login page', async () => {
    setup();
    await store.init();

    await store.signOut();

    expect(store.status()).toBe('anonymous');
    expect(TestBed.inject(Router).url).toBe('/auth/login');
  });

  it('warns and redirects when the session expires', async () => {
    setup();
    await store.init();
    const toast = TestBed.inject(ToastService);

    repository.emit('signed_out', null);
    await TestBed.inject(Router).navigated;
    await new Promise((resolve) => setTimeout(resolve));

    expect(store.isAuthenticated()).toBe(false);
    expect(toast.toasts()[0]?.message).toBe('Tu sesión ha caducado. Vuelve a iniciar sesión.');
    expect(TestBed.inject(Router).url).toBe('/auth/login?returnUrl=%2F');
  });

  it('reports the backend as unavailable', async () => {
    setup(null);
    repository.available = false;
    await store.init();

    expect(store.available()).toBe(false);
    await expect(store.signIn('a@b.c', 'x')).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('leaves the demo with a full reload instead of calling the backend', async () => {
    const reload = vi.fn();
    sessionStorage.setItem('nexo.mode', 'demo');
    sessionStorage.setItem('nexo.demo.transactions', '[]');
    setup(TEST_USER, [
      { provide: APP_MODE, useValue: 'demo' },
      { provide: RELOAD, useValue: reload },
    ]);
    await store.init();

    await store.signOut();

    expect(repository.calls).toEqual([]);
    expect(sessionStorage.getItem('nexo.mode')).toBeNull();
    expect(sessionStorage.getItem('nexo.demo.transactions')).toBeNull();
    expect(reload).toHaveBeenCalledWith('/auth/login');
  });
});
