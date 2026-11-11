import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CircleAlert, Inbox, RefreshCw, type IconNode } from 'lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { NxButton } from '../button/button';
import { NxIcon } from '../icon/icon';

const STATE_STYLES = `
  :host {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--nx-space-2);
    padding: var(--nx-space-10) var(--nx-space-6);
    text-align: center;
  }
  :host(.card) {
    padding: var(--nx-space-6) var(--nx-space-4);
  }
  .icon {
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    margin-bottom: var(--nx-space-2);
    border-radius: 18px;
    background: var(--nx-sand-100);
    color: var(--nx-navy-900);
  }
  :host(.card) .icon {
    width: 44px;
    height: 44px;
    border-radius: 14px;
  }
  .icon.error {
    background: var(--nx-danger-bg);
    color: var(--nx-danger);
  }
  .title {
    font-size: var(--nx-text-lg);
  }
  :host(.card) .title {
    font-size: var(--nx-text-base);
  }
  .description {
    max-width: 44ch;
    color: var(--nx-text-muted);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--nx-space-2);
    margin-top: var(--nx-space-3);
  }
  .actions:empty {
    display: none;
  }
`;

@Component({
  selector: 'nx-empty-state',
  imports: [NxIcon],
  template: `
    <span class="icon" aria-hidden="true">
      <svg nx-icon [icon]="icon()" [size]="variant() === 'card' ? 20 : 24"></svg>
    </span>
    <h2 class="title">{{ heading() }}</h2>
    @if (description()) {
      <p class="description">{{ description() }}</p>
    }
    <div class="actions"><ng-content /></div>
  `,
  styles: STATE_STYLES,
  host: { '[class]': 'variant()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxEmptyState {
  readonly heading = input.required<string>();
  readonly description = input('');
  readonly icon = input<IconNode>(Inbox);
  readonly variant = input<'page' | 'card'>('page');
}

@Component({
  selector: 'nx-error-state',
  imports: [NxIcon, NxButton, TranslocoPipe],
  template: `
    <span class="icon error" aria-hidden="true">
      <svg nx-icon [icon]="errorIcon" [size]="variant() === 'card' ? 20 : 24"></svg>
    </span>
    <h2 class="title">{{ heading() || ('ui.errorState.title' | transloco) }}</h2>
    <p class="description">{{ description() || ('ui.errorState.description' | transloco) }}</p>
    <div class="actions">
      <button type="button" nx-button variant="secondary" size="sm" (click)="retry.emit()">
        <svg nx-icon [icon]="retryIcon" size="16"></svg>
        {{ 'ui.retry' | transloco }}
      </button>
    </div>
  `,
  styles: STATE_STYLES,
  host: {
    role: 'alert',
    '[class]': 'variant()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxErrorState {
  readonly heading = input('');
  readonly description = input('');
  readonly variant = input<'page' | 'card'>('page');
  readonly retry = output();

  protected readonly errorIcon = CircleAlert;
  protected readonly retryIcon = RefreshCw;
}
