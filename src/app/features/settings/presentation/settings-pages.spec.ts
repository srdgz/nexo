import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LanguageService } from '@core/i18n/language.service';
import { Session } from '@core/session/session';
import { ThemeService } from '@core/theme/theme.service';
import {
  FakeAuthRepository,
  FakeAvatarStorage,
  TEST_USER,
  initTestAuth,
  provideTestAuth,
} from '../../../../testing/auth';
import { ToastService } from '@shared/ui/toast/toast';
import { provideTestI18n } from '../../../../testing/i18n';
import { SETTINGS_ROUTES } from './settings.routes';

let repository: FakeAuthRepository;
let avatars: FakeAvatarStorage;

async function settle(harness: RouterTestingHarness): Promise<void> {
  for (let round = 0; round < 3; round += 1) {
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
  }
}

async function open(url: string, user: FakeAuthRepository['user'] = TEST_USER) {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
  repository = new FakeAuthRepository(user);
  avatars = new FakeAvatarStorage();
  TestBed.configureTestingModule({
    imports: [provideTestI18n()],
    providers: [
      provideRouter(
        [
          { path: 'app/settings', children: SETTINGS_ROUTES },
          { path: '**', children: [] },
        ],
        withComponentInputBinding(),
      ),
      provideTestAuth(repository, avatars),
    ],
  });
  await initTestAuth();
  const harness = await RouterTestingHarness.create(url);
  await settle(harness);
  return { harness, root: harness.routeNativeElement as HTMLElement };
}

function type(root: HTMLElement, selector: string, value: string): void {
  const input = root.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

async function submitForm(harness: RouterTestingHarness, form: HTMLFormElement): Promise<void> {
  form.dispatchEvent(new Event('submit'));
  await settle(harness);
}

function forms(root: HTMLElement): HTMLFormElement[] {
  return Array.from(root.querySelectorAll<HTMLFormElement>('.layout form'));
}

describe('profile page', () => {
  it('shows who is signed in', async () => {
    const { root } = await open('/app/settings/profile');

    expect(root.querySelector('.identity h2')?.textContent).toBe('Laura Martín');
    expect(root.querySelector('.identity')?.textContent).toContain('Cuenta creada el');
  });

  it('saves a new name', async () => {
    const { harness, root } = await open('/app/settings/profile');

    type(root, 'input[autocomplete=name]', '  Laura Gil ');
    await submitForm(harness, forms(root)[0]!);

    expect(repository.calls).toContainEqual({
      method: 'updateProfile',
      args: [{ fullName: 'Laura Gil' }],
    });
    expect(TestBed.inject(Session).user()?.displayName).toBe('Laura Gil');
  });

  it('rejects the email already in use before calling the backend', async () => {
    const { harness, root } = await open('/app/settings/profile');

    type(root, 'input[type=email]', 'LAURA@example.com');
    await submitForm(harness, forms(root)[1]!);

    expect(repository.calls.some((call) => call.method === 'changeEmail')).toBe(false);
    expect(root.textContent).toContain('Es el email que ya usas.');
  });

  it('asks to confirm a new email from the inbox', async () => {
    const { harness, root } = await open('/app/settings/profile');

    type(root, 'input[type=email]', 'nueva@example.com');
    await submitForm(harness, forms(root)[1]!);

    const call = repository.calls.find((item) => item.method === 'changeEmail');
    expect(call?.args[0]).toBe('nueva@example.com');
    expect(String(call?.args[1])).toContain('next=%2Fapp%2Fsettings%2Fprofile');
    expect(root.querySelector('nx-alert')?.textContent).toContain('nueva@example.com');
  });

  it('shows a wrong current password on its field', async () => {
    const { harness, root } = await open('/app/settings/profile');
    const passwords = root.querySelectorAll<HTMLInputElement>('nx-password-input input');
    passwords[0]!.value = 'old-secret1';
    passwords[0]!.dispatchEvent(new Event('input'));
    passwords[1]!.value = 'new-secret1';
    passwords[1]!.dispatchEvent(new Event('input'));
    repository.failWith = 'wrong_password';

    await submitForm(harness, forms(root)[2]!);

    expect(root.textContent).toContain('La contraseña actual no es correcta.');
  });

  it('hides the password form for accounts without one', async () => {
    const { root } = await open('/app/settings/profile', { ...TEST_USER, hasPassword: false });

    expect(root.querySelector('nx-password-input')).toBeNull();
    expect(root.textContent).toContain('Entras con Google');
  });

  it('uploads a new photo and shows it', async () => {
    const { harness, root } = await open('/app/settings/profile');
    const input = root.querySelector<HTMLInputElement>('.photo-actions input[type=file]')!;
    const photo = new File(['x'], 'me.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [photo], configurable: true });

    input.dispatchEvent(new Event('change'));
    await settle(harness);

    expect(avatars.uploads).toEqual([photo]);
    expect(root.querySelector<HTMLImageElement>('.identity img')?.src).toContain(
      'res.cloudinary.com',
    );
    expect(TestBed.inject(Session).user()?.avatarUrl).toContain('res.cloudinary.com');
    expect(root.textContent).toContain('Cambiar foto');
  });

  it('rejects a photo in another format without uploading it', async () => {
    const { harness, root } = await open('/app/settings/profile');
    const input = root.querySelector<HTMLInputElement>('.photo-actions input[type=file]')!;
    Object.defineProperty(input, 'files', {
      value: [new File(['x'], 'me.gif', { type: 'image/gif' })],
      configurable: true,
    });

    input.dispatchEvent(new Event('change'));
    await settle(harness);

    expect(avatars.uploads).toEqual([]);
    expect(TestBed.inject(ToastService).toasts().at(-1)?.message).toBe(
      'La foto debe ser JPG, PNG o WebP.',
    );
  });

  it('removes the photo', async () => {
    const { harness, root } = await open('/app/settings/profile', {
      ...TEST_USER,
      avatarUrl: 'https://res.cloudinary.com/test/image/upload/v1/avatar',
    });
    const remove = Array.from(
      root.querySelectorAll<HTMLButtonElement>('.photo-actions button'),
    ).find((button) => button.textContent?.includes('Quitar'))!;

    remove.click();
    await settle(harness);

    expect(avatars.removed).toBe(1);
    expect(root.querySelector('.identity img')).toBeNull();
    expect(root.textContent).toContain('Añadir foto');
  });

  it('deletes the account only after typing the confirmation word', async () => {
    const { harness, root } = await open('/app/settings/profile');
    root.querySelector<HTMLButtonElement>('.danger button')!.click();
    await settle(harness);
    const confirm = root.querySelector<HTMLButtonElement>(
      'nx-delete-account-dialog [variant=danger]',
    );

    expect(confirm?.disabled).toBe(true);

    type(root, 'nx-delete-account-dialog input', 'ELIMINAR');
    await settle(harness);
    confirm!.click();
    await settle(harness);

    expect(repository.calls.some((call) => call.method === 'deleteAccount')).toBe(true);
    expect(TestBed.inject(Router).url).toBe('/auth/login');
  });
});

describe('preferences page', () => {
  it('changes the language and saves it to the profile', async () => {
    const { harness, root } = await open('/app/settings/preferences');
    const english = Array.from(root.querySelectorAll<HTMLInputElement>('nx-segmented input'))[4]!;

    english.click();
    await settle(harness);

    expect(TestBed.inject(LanguageService).current()).toBe('en');
    expect(repository.calls).toContainEqual({ method: 'updateProfile', args: [{ locale: 'en' }] });
    expect(root.textContent).toContain('First day of the week');
  });

  it('switches to the dark theme and saves it to the profile', async () => {
    const { harness, root } = await open('/app/settings/preferences');
    const dark = Array.from(root.querySelectorAll<HTMLInputElement>('nx-segmented input'))[2]!;

    dark.click();
    await settle(harness);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(repository.calls).toContainEqual({ method: 'updateProfile', args: [{ theme: 'dark' }] });
    TestBed.inject(ThemeService).use('system');
  });

  it('saves the first day of the week', async () => {
    const { harness, root } = await open('/app/settings/preferences');
    const sunday = Array.from(root.querySelectorAll<HTMLInputElement>('nx-segmented input'))[6]!;

    sunday.click();
    await settle(harness);

    expect(TestBed.inject(Session).user()?.weekStartsOn).toBe(0);
  });

  it('previews amounts in the active language', async () => {
    const { root } = await open('/app/settings/preferences');

    expect(root.querySelector('.preview b')?.textContent?.replace(/\s/g, ' ')).toBe('1.842,30 €');
  });
});
