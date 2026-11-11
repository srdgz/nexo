import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CircleAlert, CircleCheck, Info } from 'lucide';
import { NxIcon } from '../icon/icon';

export type AlertTone = 'danger' | 'info' | 'success';

@Component({
  selector: 'nx-alert',
  imports: [NxIcon],
  template: `
    <svg nx-icon class="icon" [icon]="icon()" size="18"></svg>
    <div class="body"><ng-content /></div>
  `,
  styles: `
    :host {
      --tone: var(--nx-info);
      --tone-bg: var(--nx-info-bg);

      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      border-radius: var(--nx-radius-md);
      background: var(--tone-bg);
      color: var(--nx-text);
      font-size: var(--nx-text-sm);
    }
    :host(.danger) {
      --tone: var(--nx-danger);
      --tone-bg: var(--nx-danger-bg);
    }
    :host(.success) {
      --tone: var(--nx-success);
      --tone-bg: var(--nx-success-bg);
    }
    .icon {
      flex: none;
      margin-top: 1px;
      color: var(--tone);
    }
    .body {
      display: grid;
      flex: 1;
      gap: var(--nx-space-2);
      justify-items: start;
    }
  `,
  host: {
    '[class]': 'tone()',
    '[attr.role]': 'tone() === "danger" ? "alert" : "status"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxAlert {
  readonly tone = input<AlertTone>('info');

  protected readonly icon = computed(() => {
    switch (this.tone()) {
      case 'danger':
        return CircleAlert;
      case 'success':
        return CircleCheck;
      default:
        return Info;
    }
  });
}
