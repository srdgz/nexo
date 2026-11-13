import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  FormField,
  disabled,
  email,
  form,
  maxLength,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Camera, LogOut, Trash2 } from 'lucide';
import { AuthStore } from '@features/auth/application/auth-store';
import { type AuthErrorCode, toAuthError } from '@features/auth/domain/auth-error';
import { isSameEmail } from '@features/auth/domain/auth-user';
import { isValidPassword } from '@features/auth/domain/password-policy';
import { authMessageKey } from '@features/auth/presentation/auth-messages';
import { NxPasswordChecks } from '@features/auth/presentation/components/password-checks';
import { NxAlert } from '@shared/ui/alert/alert';
import { NxAvatar } from '@shared/ui/avatar/avatar';
import { NxButton } from '@shared/ui/button/button';
import { NxCard, NxCardHeader } from '@shared/ui/card/card';
import { NxField, NxInput } from '@shared/ui/field/field';
import { NxIcon } from '@shared/ui/icon/icon';
import { NxPasswordInput } from '@shared/ui/password-input/password-input';
import { ToastService } from '@shared/ui/toast/toast';
import { injectActiveLanguage, localeFor } from '@shared/util/active-language';
import { NxDeleteAccountDialog } from '../../components/delete-account-dialog';

@Component({
  selector: 'nx-profile-page',
  imports: [
    FormField,
    NxAlert,
    NxAvatar,
    NxButton,
    NxCard,
    NxCardHeader,
    NxDeleteAccountDialog,
    NxField,
    NxIcon,
    NxInput,
    NxPasswordChecks,
    NxPasswordInput,
    TranslocoPipe,
  ],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  protected readonly store = inject(AuthStore);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly language = injectActiveLanguage();

  protected readonly icons = { camera: Camera, signOut: LogOut, trash: Trash2 };
  protected readonly demo = this.store.mode === 'demo';
  protected readonly user = this.store.authUser;
  protected readonly messageKey = authMessageKey;
  protected readonly deleting = signal(false);
  protected readonly photoBusy = signal<'upload' | 'remove' | null>(null);

  protected readonly since = computed(() => {
    const created = this.user()?.createdAt;
    return created
      ? new Intl.DateTimeFormat(localeFor(this.language()), { dateStyle: 'long' }).format(
          new Date(created),
        )
      : null;
  });

  private readonly nameModel = signal({ fullName: '' });
  protected readonly nameForm = form(this.nameModel, (path) => {
    required(path.fullName);
    maxLength(path.fullName, 80);
  });
  protected readonly nameChanged = computed(
    () => this.nameModel().fullName.trim() !== (this.user()?.displayName ?? ''),
  );
  protected readonly nameError = signal<AuthErrorCode | null>(null);

  private readonly emailModel = signal({ email: '' });
  protected readonly emailForm = form(this.emailModel, (path) => {
    disabled(path.email, () => this.demo);
    required(path.email);
    email(path.email);
    validate(path.email, ({ value }) =>
      value() && isSameEmail(value(), this.user()?.email ?? '') ? { kind: 'sameEmail' } : undefined,
    );
  });
  protected readonly emailError = signal<AuthErrorCode | null>(null);
  protected readonly emailSentTo = signal<string | null>(null);

  private readonly passwordModel = signal({ current: '', next: '' });
  protected readonly passwordForm = form(this.passwordModel, (path) => {
    disabled(path.current, () => this.demo);
    disabled(path.next, () => this.demo);
    required(path.current);
    required(path.next);
    validate(path.next, ({ value }) =>
      value() && !isValidPassword(value()) ? { kind: 'passwordPolicy' } : undefined,
    );
  });
  protected readonly passwordError = signal<AuthErrorCode | null>(null);
  protected readonly nextPassword = computed(() => this.passwordModel().next);

  constructor() {
    effect(() => {
      const name = this.user()?.displayName ?? '';
      this.nameModel.set({ fullName: name });
    });
  }

  protected async saveName(event: Event): Promise<void> {
    event.preventDefault();
    this.nameError.set(null);
    await submit(this.nameForm, async () => {
      try {
        await this.store.updateProfile({ fullName: this.nameModel().fullName });
        this.nameForm().reset();
        this.toast.success(this.transloco.translate('settings.profile.nameSaved'));
      } catch (error) {
        this.nameError.set(toAuthError(error).code);
      }
      return undefined;
    });
  }

  protected async saveEmail(event: Event): Promise<void> {
    event.preventDefault();
    this.emailError.set(null);
    this.emailSentTo.set(null);
    await submit(this.emailForm, async () => {
      const address = this.emailModel().email.trim();
      try {
        await this.store.changeEmail(address);
        this.emailSentTo.set(address);
        this.emailModel.set({ email: '' });
        this.emailForm().reset();
      } catch (error) {
        const code = toAuthError(error).code;
        if (code === 'email_taken' || code === 'invalid_email') {
          return {
            kind: code,
            message: this.transloco.translate(authMessageKey(code)),
            fieldTree: this.emailForm.email,
          };
        }
        this.emailError.set(code);
      }
      return undefined;
    });
  }

  protected async savePassword(event: Event): Promise<void> {
    event.preventDefault();
    this.passwordError.set(null);
    await submit(this.passwordForm, async () => {
      const { current, next } = this.passwordModel();
      try {
        await this.store.changePassword(current, next);
        this.passwordModel.set({ current: '', next: '' });
        this.passwordForm().reset();
        this.toast.success(this.transloco.translate('settings.profile.passwordSaved'));
      } catch (error) {
        const code = toAuthError(error).code;
        if (code === 'wrong_password') {
          return {
            kind: code,
            message: this.transloco.translate(authMessageKey(code)),
            fieldTree: this.passwordForm.current,
          };
        }
        this.passwordError.set(code);
      }
      return undefined;
    });
  }

  protected async uploadPhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    await this.photoTask(
      'upload',
      () => this.store.changeAvatar(file),
      'settings.profile.photoSaved',
    );
  }

  protected removePhoto(): Promise<void> {
    return this.photoTask(
      'remove',
      () => this.store.removeAvatar(),
      'settings.profile.photoRemoved',
    );
  }

  private async photoTask(
    kind: 'upload' | 'remove',
    task: () => Promise<void>,
    successKey: string,
  ): Promise<void> {
    this.photoBusy.set(kind);
    try {
      await task();
      this.toast.success(this.transloco.translate(successKey));
    } catch (error) {
      this.toast.error(this.transloco.translate(authMessageKey(toAuthError(error).code)));
    } finally {
      this.photoBusy.set(null);
    }
  }

  protected signOut(): void {
    void this.store.signOut();
  }
}
