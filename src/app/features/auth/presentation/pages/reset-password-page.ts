import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { KeyRound } from 'lucide';
import { NxAlert } from '@shared/ui/alert/alert';
import { NxButton } from '@shared/ui/button/button';
import { NxField } from '@shared/ui/field/field';
import { NxIcon } from '@shared/ui/icon/icon';
import { NxPasswordInput } from '@shared/ui/password-input/password-input';
import { ToastService } from '@shared/ui/toast/toast';
import { AuthStore } from '../../application/auth-store';
import { type AuthErrorCode, toAuthError } from '../../domain/auth-error';
import { isValidPassword } from '../../domain/password-policy';
import { authMessageKey } from '../auth-messages';
import { NxPasswordChecks } from '../components/password-checks';

@Component({
  selector: 'nx-reset-password-page',
  imports: [
    FormField,
    NxAlert,
    NxButton,
    NxField,
    NxIcon,
    NxPasswordChecks,
    NxPasswordInput,
    RouterLink,
    TranslocoPipe,
  ],
  template: `
    @if (store.isAuthenticated()) {
      <div class="heading">
        <h1>{{ 'auth.reset.title' | transloco }}</h1>
        <p class="subtitle">{{ 'auth.reset.subtitle' | transloco }}</p>
      </div>

      @if (error(); as code) {
        <nx-alert tone="danger">{{ messageKey(code) | transloco }}</nx-alert>
      }

      <form class="form" novalidate (submit)="onSubmit($event)">
        <nx-field [label]="'auth.fields.newPassword' | transloco" [state]="passwords.password()">
          <nx-password-input autocomplete="new-password" [formField]="passwords.password" />
        </nx-field>
        <nx-password-checks [password]="model().password" />
        <nx-field [label]="'auth.fields.confirmPassword' | transloco" [state]="passwords.confirm()">
          <nx-password-input autocomplete="new-password" [formField]="passwords.confirm" />
        </nx-field>
        <button type="submit" nx-button size="lg" block [loading]="passwords().submitting()">
          {{ 'auth.reset.submit' | transloco }}
        </button>
      </form>
    } @else {
      <div class="heading centered">
        <span class="badge-icon" aria-hidden="true">
          <svg nx-icon [icon]="keyIcon" size="28"></svg>
        </span>
        <h1>{{ 'auth.reset.expiredTitle' | transloco }}</h1>
        <p class="subtitle">{{ 'auth.reset.expiredText' | transloco }}</p>
      </div>
      <a nx-button size="lg" block routerLink="/auth/forgot-password">
        {{ 'auth.reset.requestAgain' | transloco }}
      </a>
    }
  `,
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage {
  protected readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  protected readonly keyIcon = KeyRound;
  protected readonly model = signal({ password: '', confirm: '' });
  protected readonly passwords = form(this.model, (path) => {
    required(path.password);
    validate(path.password, ({ value }) =>
      value() && !isValidPassword(value()) ? { kind: 'passwordPolicy' } : undefined,
    );
    required(path.confirm);
    validate(path.confirm, ({ value, valueOf }) =>
      value() && value() !== valueOf(path.password) ? { kind: 'mismatch' } : undefined,
    );
  });
  protected readonly error = signal<AuthErrorCode | null>(null);
  protected readonly messageKey = authMessageKey;

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(null);
    await submit(this.passwords, async () => {
      try {
        await this.store.updatePassword(this.model().password);
        this.toast.success(this.transloco.translate('auth.reset.done'));
        await this.router.navigateByUrl('/app/dashboard');
      } catch (error) {
        this.error.set(toAuthError(error).code);
      }
      return undefined;
    });
  }
}
