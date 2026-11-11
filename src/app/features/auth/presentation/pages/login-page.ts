import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { NxAlert } from '@shared/ui/alert/alert';
import { NxButton } from '@shared/ui/button/button';
import { NxField, NxInput } from '@shared/ui/field/field';
import { NxPasswordInput } from '@shared/ui/password-input/password-input';
import { ToastService } from '@shared/ui/toast/toast';
import { AuthStore } from '../../application/auth-store';
import { type AuthErrorCode, toAuthError } from '../../domain/auth-error';
import { safeReturnUrl } from '../../domain/return-url';
import { authMessageKey } from '../auth-messages';

@Component({
  selector: 'nx-login-page',
  imports: [
    FormField,
    NxAlert,
    NxButton,
    NxField,
    NxInput,
    NxPasswordInput,
    RouterLink,
    TranslocoPipe,
  ],
  templateUrl: './login-page.html',
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  readonly returnUrl = input<string>();

  protected readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  private readonly model = signal({ email: '', password: '' });
  protected readonly credentials = form(this.model, (path) => {
    required(path.email);
    email(path.email);
    required(path.password);
  });

  protected readonly error = signal<AuthErrorCode | null>(null);
  protected readonly resent = signal(false);
  protected readonly messageKey = authMessageKey;

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(null);
    this.resent.set(false);
    await submit(this.credentials, async () => {
      try {
        const { email: address, password } = this.model();
        await this.store.signIn(address, password);
        await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
      } catch (error) {
        this.error.set(toAuthError(error).code);
      }
      return undefined;
    });
  }

  protected async resendVerification(): Promise<void> {
    try {
      await this.store.resendVerification(this.model().email);
      this.resent.set(true);
    } catch (error) {
      this.toast.error(this.transloco.translate(authMessageKey(toAuthError(error).code)));
    }
  }
}
