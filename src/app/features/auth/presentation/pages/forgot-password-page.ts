import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { NxAlert } from '@shared/ui/alert/alert';
import { NxButton } from '@shared/ui/button/button';
import { NxField, NxInput } from '@shared/ui/field/field';
import { AuthStore } from '../../application/auth-store';
import { type AuthErrorCode, toAuthError } from '../../domain/auth-error';
import { authMessageKey } from '../auth-messages';

const VISIBLE_ERRORS: readonly AuthErrorCode[] = ['network', 'rate_limited', 'unavailable'];

@Component({
  selector: 'nx-forgot-password-page',
  imports: [FormField, NxAlert, NxButton, NxField, NxInput, RouterLink, TranslocoPipe],
  template: `
    <div class="heading">
      <h1>{{ 'auth.forgot.title' | transloco }}</h1>
      <p class="subtitle">{{ 'auth.forgot.subtitle' | transloco }}</p>
    </div>

    @if (error(); as code) {
      <nx-alert tone="danger">{{ messageKey(code) | transloco }}</nx-alert>
    }

    <form class="form" novalidate (submit)="onSubmit($event)">
      <nx-field [label]="'auth.fields.email' | transloco" [state]="request.email()">
        <input nxInput type="email" autocomplete="email" [formField]="request.email" />
      </nx-field>
      <button type="submit" nx-button size="lg" block [loading]="request().submitting()">
        {{ 'auth.forgot.submit' | transloco }}
      </button>
    </form>

    @if (sent()) {
      <nx-alert tone="success">{{ 'auth.forgot.sent' | transloco }}</nx-alert>
    }

    <p class="footer">
      <a class="link" routerLink="/auth/login">{{ 'auth.forgot.back' | transloco }}</a>
    </p>
  `,
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
  private readonly store = inject(AuthStore);
  private readonly model = signal({ email: '' });

  protected readonly request = form(this.model, (path) => {
    required(path.email);
    email(path.email);
  });
  protected readonly sent = signal(false);
  protected readonly error = signal<AuthErrorCode | null>(null);
  protected readonly messageKey = authMessageKey;

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(null);
    this.sent.set(false);
    await submit(this.request, async () => {
      try {
        await this.store.requestPasswordReset(this.model().email);
        this.sent.set(true);
      } catch (error) {
        const code = toAuthError(error).code;
        if (VISIBLE_ERRORS.includes(code)) {
          this.error.set(code);
        } else {
          this.sent.set(true);
        }
      }
      return undefined;
    });
  }
}
