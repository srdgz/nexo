import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FakeAuthRepository, initTestAuth, provideTestAuth } from '../../../../../testing/auth';
import { provideTestI18n } from '../../../../../testing/i18n';
import { AUTH_ROUTES } from '../auth.routes';

let repository: FakeAuthRepository;

async function open(
  url: string,
  user: FakeAuthRepository['user'] = null,
  failWith: FakeAuthRepository['failWith'] = null,
) {
  repository = new FakeAuthRepository(user);
  repository.failWith = failWith;
  TestBed.configureTestingModule({
    imports: [provideTestI18n()],
    providers: [
      provideRouter(
        [
          { path: 'auth', children: AUTH_ROUTES },
          { path: 'app/**', children: [] },
          { path: '**', children: [] },
        ],
        withComponentInputBinding(),
      ),
      provideTestAuth(repository),
    ],
  });
  await initTestAuth();
  const harness = await RouterTestingHarness.create(url);
  return { harness, root: harness.routeNativeElement as HTMLElement };
}

function type(root: HTMLElement, selector: string, value: string): void {
  const input = root.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

async function submitForm(harness: RouterTestingHarness, root: HTMLElement): Promise<void> {
  root.querySelector('form')!.dispatchEvent(new Event('submit'));
  await new Promise((resolve) => setTimeout(resolve));
  await harness.fixture.whenStable();
}

const url = () => TestBed.inject(Router).url;

describe('login page', () => {
  it('validates the fields before calling the backend', async () => {
    const { harness, root } = await open('/auth/login');

    await submitForm(harness, root);

    expect(repository.calls).toEqual([]);
    expect(root.querySelectorAll('nx-field .error')).toHaveLength(2);
  });

  it('goes to the requested page after signing in', async () => {
    const { harness, root } = await open('/auth/login?returnUrl=%2Fapp%2Ffinances%2Fbudgets');

    type(root, 'input[type=email]', 'ana@example.com');
    type(root, 'nx-password-input input', 'nexo2026');
    await submitForm(harness, root);

    expect(repository.calls[0]?.method).toBe('signIn');
    expect(url()).toBe('/app/finances/budgets');
  });

  it('ignores return urls outside the app', async () => {
    const { harness, root } = await open('/auth/login?returnUrl=https%3A%2F%2Fevil.example');

    type(root, 'input[type=email]', 'ana@example.com');
    type(root, 'nx-password-input input', 'nexo2026');
    await submitForm(harness, root);

    expect(url()).toBe('/app/dashboard');
  });

  it('shows a generic message for wrong credentials', async () => {
    const { harness, root } = await open('/auth/login');
    repository.failWith = 'invalid_credentials';

    type(root, 'input[type=email]', 'ana@example.com');
    type(root, 'nx-password-input input', 'wrong-pass1');
    await submitForm(harness, root);

    expect(root.querySelector('nx-alert[role=alert]')?.textContent).toContain(
      'Email o contraseña incorrectos.',
    );
    expect(url()).toBe('/auth/login');
  });

  it('offers to resend the link when the email is not confirmed', async () => {
    const { harness, root } = await open('/auth/login');
    repository.failWith = 'email_not_confirmed';
    type(root, 'input[type=email]', 'ana@example.com');
    type(root, 'nx-password-input input', 'nexo2026');
    await submitForm(harness, root);

    repository.failWith = null;
    root.querySelector<HTMLButtonElement>('nx-alert .inline-button')!.click();
    await harness.fixture.whenStable();

    expect(repository.calls.at(-1)?.method).toBe('resendVerification');
    expect(root.querySelector('nx-alert')?.textContent).toContain('nuevo enlace');
  });

  it('explains that accounts are not available and disables the form', async () => {
    repository = new FakeAuthRepository(null);
    const { root } = await (async () => {
      TestBed.configureTestingModule({
        imports: [provideTestI18n()],
        providers: [
          provideRouter([{ path: 'auth', children: AUTH_ROUTES }]),
          provideTestAuth(Object.assign(repository, { available: false })),
        ],
      });
      await initTestAuth();
      const harness = await RouterTestingHarness.create('/auth/login');
      return { root: harness.routeNativeElement as HTMLElement };
    })();

    expect(root.querySelector('nx-alert')?.textContent).toContain('explorar la demo');
    expect(root.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true);
    expect(root.querySelector('a[href="/demo"]')).not.toBeNull();
  });
});

describe('register page', () => {
  it('creates the account in the current language and asks to check the email', async () => {
    const { harness, root } = await open('/auth/register');

    type(root, 'input[autocomplete=name]', ' Ana López ');
    type(root, 'input[type=email]', 'ana@example.com');
    type(root, 'nx-password-input input', 'nexo2026');
    await submitForm(harness, root);

    expect(repository.calls[0]?.args[0]).toEqual({
      fullName: 'Ana López',
      email: 'ana@example.com',
      password: 'nexo2026',
      locale: 'es',
    });
    expect(url()).toBe('/auth/verify-email');
    expect(harness.routeNativeElement?.textContent).toContain('ana@example.com');
  });

  it('rejects passwords without numbers', async () => {
    const { harness, root } = await open('/auth/register');

    type(root, 'input[autocomplete=name]', 'Ana');
    type(root, 'input[type=email]', 'ana@example.com');
    type(root, 'nx-password-input input', 'onlyletters');
    await submitForm(harness, root);

    expect(repository.calls).toEqual([]);
    expect(root.textContent).toContain('Usa al menos 8 caracteres con letras y números.');
  });

  it('shows a taken email under the email field', async () => {
    const { harness, root } = await open('/auth/register');
    repository.failWith = 'email_taken';

    type(root, 'input[autocomplete=name]', 'Ana');
    type(root, 'input[type=email]', 'ana@example.com');
    type(root, 'nx-password-input input', 'nexo2026');
    await submitForm(harness, root);

    const emailField = root.querySelectorAll('nx-field')[1]!;
    expect(emailField.querySelector('.error')?.textContent).toContain('Ya existe una cuenta');
    expect(url()).toBe('/auth/register');
  });
});

describe('password recovery', () => {
  it('always shows the neutral message after asking for a link', async () => {
    const { harness, root } = await open('/auth/forgot-password');
    repository.failWith = 'unknown';

    type(root, 'input[type=email]', 'nobody@example.com');
    await submitForm(harness, root);

    expect(root.textContent).toContain('Si existe una cuenta con ese email');
  });

  it('says the link expired when there is no recovery session', async () => {
    const { root } = await open('/auth/reset-password');

    expect(root.querySelector('h1')?.textContent).toContain('El enlace ha caducado');
  });

  it('checks that both passwords match', async () => {
    const { harness, root } = await open('/auth/reset-password', {
      id: 'u1',
      email: 'ana@example.com',
      displayName: 'Ana',
      locale: 'es',
    });
    const inputs = root.querySelectorAll<HTMLInputElement>('nx-password-input input');

    inputs[0]!.value = 'nexo2026';
    inputs[0]!.dispatchEvent(new Event('input'));
    inputs[1]!.value = 'nexo2025';
    inputs[1]!.dispatchEvent(new Event('input'));
    await submitForm(harness, root);

    expect(root.textContent).toContain('Las contraseñas no coinciden.');
    expect(repository.calls).toEqual([]);
  });
});

describe('email link callback', () => {
  it('exchanges the code and goes to the requested page', async () => {
    await open('/auth/callback?code=abc&next=%2Fauth%2Freset-password');
    await new Promise((resolve) => setTimeout(resolve));

    expect(repository.calls[0]).toEqual({
      method: 'completeEmailLink',
      args: [{ code: 'abc', errorCode: null }],
    });
    expect(url()).toBe('/auth/reset-password');
  });

  it('explains an expired link', async () => {
    const { harness } = await open('/auth/callback?error_code=otp_expired', null, 'link_expired');
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();

    expect(harness.routeNativeElement?.textContent).toContain('No hemos podido usar el enlace');
  });
});
