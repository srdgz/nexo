import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MailCheck } from 'lucide';
import { NxButton } from '@shared/ui/button/button';
import { NxIcon } from '@shared/ui/icon/icon';
import { ToastService } from '@shared/ui/toast/toast';
import { AuthStore } from '../../application/auth-store';
import { toAuthError } from '../../domain/auth-error';
import { authMessageKey } from '../auth-messages';
import { readPendingEmail } from '../pending-email';

export const RESEND_COOLDOWN_SECONDS = 60;

@Component({
  selector: 'nx-verify-email-page',
  imports: [NxButton, NxIcon, RouterLink, TranslocoPipe],
  template: `
    <div class="heading centered">
      <span class="badge-icon" aria-hidden="true">
        <svg nx-icon [icon]="mailIcon" size="28"></svg>
      </span>
      <h1>{{ 'auth.verify.title' | transloco }}</h1>
      <p class="subtitle">
        @if (email) {
          {{ 'auth.verify.text' | transloco: { email } }}
        } @else {
          {{ 'auth.verify.textNoEmail' | transloco }}
        }
      </p>
    </div>

    @if (email) {
      <button
        type="button"
        nx-button
        variant="secondary"
        size="lg"
        block
        [disabled]="remaining() > 0"
        [loading]="sending()"
        (click)="resend()"
      >
        @if (remaining() > 0) {
          {{ 'auth.verify.resendIn' | transloco: { seconds: remaining() } }}
        } @else {
          {{ 'auth.verify.resend' | transloco }}
        }
      </button>
    }

    <p class="footer">
      {{ 'auth.verify.wrongEmail' | transloco }}
      <a class="link" routerLink="/auth/register">{{ 'auth.verify.backToRegister' | transloco }}</a>
    </p>
  `,
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailPage {
  private readonly store = inject(AuthStore);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  protected readonly email = readPendingEmail();
  protected readonly mailIcon = MailCheck;
  protected readonly sending = signal(false);

  private readonly cooldownEndsAt = signal(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
  private readonly now = signal(Date.now());
  protected readonly remaining = computed(() =>
    Math.max(0, Math.ceil((this.cooldownEndsAt() - this.now()) / 1000)),
  );

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected async resend(): Promise<void> {
    this.sending.set(true);
    try {
      await this.store.resendVerification(this.email);
      this.toast.success(this.transloco.translate('auth.verify.resent'));
      this.cooldownEndsAt.set(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
      this.now.set(Date.now());
    } catch (error) {
      this.toast.error(this.transloco.translate(authMessageKey(toAuthError(error).code)));
    } finally {
      this.sending.set(false);
    }
  }
}
