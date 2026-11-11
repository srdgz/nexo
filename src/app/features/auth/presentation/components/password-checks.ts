import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Check, Circle } from 'lucide';
import { NxIcon } from '@shared/ui/icon/icon';
import { checkPassword } from '../../domain/password-policy';

@Component({
  selector: 'nx-password-checks',
  imports: [NxIcon, TranslocoPipe],
  template: `
    @for (rule of rules(); track rule.key) {
      <li [class.met]="rule.met">
        <svg nx-icon [icon]="rule.met ? checkIcon : pendingIcon" size="14" strokeWidth="2.4"></svg>
        {{ rule.key | transloco }}
        <span class="nx-visually-hidden">
          {{ (rule.met ? 'auth.checks.met' : 'auth.checks.pending') | transloco }}
        </span>
      </li>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: var(--nx-space-1) var(--nx-space-4);
      margin: calc(var(--nx-space-2) * -1) 0 0;
      padding: 0;
      list-style: none;
      color: var(--nx-text-muted);
      font-size: var(--nx-text-xs);
    }
    li {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .met {
      color: var(--nx-success);
      font-weight: 600;
    }
  `,
  host: { role: 'list' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxPasswordChecks {
  readonly password = input.required<string>();

  protected readonly checkIcon = Check;
  protected readonly pendingIcon = Circle;
  protected readonly rules = computed(() => {
    const checks = checkPassword(this.password());
    return [
      { key: 'auth.checks.length', met: checks.length },
      { key: 'auth.checks.lettersAndDigits', met: checks.lettersAndDigits },
    ];
  });
}
