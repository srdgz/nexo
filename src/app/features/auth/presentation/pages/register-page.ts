import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormField,
  email,
  form,
  maxLength,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '@core/i18n/language.service';
import { NxAlert } from '@shared/ui/alert/alert';
import { NxButton } from '@shared/ui/button/button';
import { NxField, NxInput } from '@shared/ui/field/field';
import { NxPasswordInput } from '@shared/ui/password-input/password-input';
import { AuthStore } from '../../application/auth-store';
import { type AuthErrorCode, toAuthError } from '../../domain/auth-error';
import { isValidPassword } from '../../domain/password-policy';
import { authMessageKey } from '../auth-messages';
import { NxPasswordChecks } from '../components/password-checks';
import { savePendingEmail } from '../pending-email';

@Component({
  selector: 'nx-register-page',
  imports: [
    FormField,
    NxAlert,
    NxButton,
    NxField,
    NxInput,
    NxPasswordChecks,
    NxPasswordInput,
    RouterLink,
    TranslocoPipe,
  ],
  templateUrl: './register-page.html',
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  protected readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);
  private readonly transloco = inject(TranslocoService);

  protected readonly model = signal({ fullName: '', email: '', password: '' });
  protected readonly account = form(this.model, (path) => {
    required(path.fullName);
    maxLength(path.fullName, 80);
    required(path.email);
    email(path.email);
    required(path.password);
    validate(path.password, ({ value }) =>
      value() && !isValidPassword(value()) ? { kind: 'passwordPolicy' } : undefined,
    );
  });

  protected readonly error = signal<AuthErrorCode | null>(null);
  protected readonly messageKey = authMessageKey;

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(null);
    await submit(this.account, async () => {
      try {
        const data = this.model();
        await this.store.signUp({ ...data, locale: this.language.current() });
        savePendingEmail(data.email.trim());
        await this.router.navigateByUrl('/auth/verify-email');
        return undefined;
      } catch (error) {
        const code = toAuthError(error).code;
        if (code === 'email_taken') {
          return {
            kind: 'emailTaken',
            message: this.transloco.translate(authMessageKey(code)),
            fieldTree: this.account.email,
          };
        }
        if (code === 'weak_password') {
          return { kind: 'passwordPolicy', fieldTree: this.account.password };
        }
        this.error.set(code);
        return undefined;
      }
    });
  }
}
