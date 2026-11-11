import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  booleanAttribute,
  inject,
  input,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { FlaskConical, RotateCcw, UserPlus } from 'lucide';
import { NxButton } from '@shared/ui/button/button';
import { NxIcon } from '@shared/ui/icon/icon';
import { NxMenu, NxMenuItem, NxMenuTrigger } from '@shared/ui/menu/menu';
import { RELOAD, clearDemoData, leaveDemo } from '../../app-mode/app-mode';

@Component({
  selector: 'nx-demo-banner',
  imports: [NxButton, NxIcon, NxMenu, NxMenuItem, NxMenuTrigger, TranslocoPipe],
  template: `
    <span class="icon" aria-hidden="true">
      <svg nx-icon [icon]="icons.demo" size="18"></svg>
    </span>
    <p class="text">
      <strong id="nx-demo-banner-title">{{
        (compact() ? 'demo.titleShort' : 'demo.title') | transloco
      }}</strong>
      <span class="hint">{{ 'demo.hint' | transloco }}</span>
    </p>
    @if (compact()) {
      <button nx-button variant="secondary" size="sm" [nxMenuTrigger]="options">
        {{ 'demo.options' | transloco }}
      </button>
      <nx-menu #options [label]="'demo.options' | transloco">
        <button type="button" nx-menu-item (click)="reset()">
          <svg nx-icon [icon]="icons.reset" size="18"></svg>
          {{ 'demo.reset' | transloco }}
        </button>
        <button type="button" nx-menu-item (click)="createAccount()">
          <svg nx-icon [icon]="icons.register" size="18"></svg>
          {{ 'demo.createAccount' | transloco }}
        </button>
      </nx-menu>
    } @else {
      <div class="actions">
        <button type="button" nx-button variant="secondary" size="sm" (click)="reset()">
          <svg nx-icon [icon]="icons.reset" size="16"></svg>
          {{ 'demo.reset' | transloco }}
        </button>
        <button type="button" nx-button size="sm" (click)="createAccount()">
          {{ 'demo.createAccount' | transloco }}
        </button>
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: var(--nx-space-3);
      padding: 10px 12px 10px 14px;
      border-radius: 18px;
      background: var(--nx-sand-100);
    }
    :host(.compact) {
      margin: 0 var(--nx-space-4);
    }
    .icon {
      display: grid;
      place-items: center;
      flex: none;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: var(--nx-surface);
    }
    .text {
      display: flex;
      flex: 1;
      flex-wrap: wrap;
      column-gap: var(--nx-space-2);
      min-width: 0;
      font-size: var(--nx-text-sm);
    }
    .hint {
      color: var(--nx-text-muted);
    }
    .actions {
      display: flex;
      gap: var(--nx-space-2);
    }
  `,
  host: {
    role: 'region',
    'aria-labelledby': 'nx-demo-banner-title',
    '[class.compact]': 'compact()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxDemoBanner {
  readonly compact = input(false, { transform: booleanAttribute });

  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly reload = inject(RELOAD);

  protected readonly icons = { demo: FlaskConical, reset: RotateCcw, register: UserPlus };

  protected reset(): void {
    clearDemoData(this.document);
    this.reload(this.router.url);
  }

  protected createAccount(): void {
    leaveDemo(this.document);
    this.reload('/auth/register');
  }
}
