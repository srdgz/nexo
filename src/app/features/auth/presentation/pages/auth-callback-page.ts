import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, DOCUMENT, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Link2Off } from 'lucide';
import { NxButton } from '@shared/ui/button/button';
import { NxIcon } from '@shared/ui/icon/icon';
import { ToastService } from '@shared/ui/toast/toast';
import { AuthStore } from '../../application/auth-store';
import { type AuthErrorCode, toAuthError } from '../../domain/auth-error';
import { safeLinkTarget } from '../../domain/return-url';
import { authMessageKey } from '../auth-messages';

@Component({
  selector: 'nx-auth-callback-page',
  imports: [NxButton, NxIcon, RouterLink, TranslocoPipe],
  template: `
    @if (error(); as code) {
      <div class="heading centered">
        <span class="badge-icon" aria-hidden="true">
          <svg nx-icon [icon]="linkIcon" size="28"></svg>
        </span>
        <h1>{{ 'auth.callback.errorTitle' | transloco }}</h1>
        <p class="subtitle">{{ messageKey(code) | transloco }}</p>
      </div>
      <a nx-button size="lg" block routerLink="/auth/login">
        {{ 'auth.callback.backToLogin' | transloco }}
      </a>
      @if (code === 'link_expired') {
        <p class="footer">
          <a class="link" routerLink="/auth/forgot-password">
            {{ 'auth.callback.requestAgain' | transloco }}
          </a>
        </p>
      }
    } @else {
      <div class="heading centered" role="status">
        <h1>{{ 'auth.callback.checking' | transloco }}</h1>
      </div>
    }
  `,
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthCallbackPage implements OnInit {
  private readonly store = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  protected readonly error = signal<AuthErrorCode | null>(null);
  protected readonly linkIcon = Link2Off;
  protected readonly messageKey = authMessageKey;

  async ngOnInit(): Promise<void> {
    const query = this.route.snapshot.queryParamMap;
    const hash = new URLSearchParams(this.document.location.hash.replace(/^#/, ''));
    if (!query.get('code') && !query.get('error') && hash.get('message')) {
      this.toast.info(this.transloco.translate('auth.callback.confirmOther'));
      await this.router.navigateByUrl(safeLinkTarget(query.get('next')), { replaceUrl: true });
      return;
    }
    try {
      await this.store.completeEmailLink({
        code: query.get('code'),
        errorCode:
          query.get('error_code') ??
          query.get('error') ??
          hash.get('error_code') ??
          hash.get('error'),
      });
      await this.router.navigateByUrl(safeLinkTarget(query.get('next')), { replaceUrl: true });
    } catch (error) {
      this.error.set(toAuthError(error).code);
    }
  }
}
