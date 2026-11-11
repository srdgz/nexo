import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { Eye, EyeOff } from 'lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { NxField } from '../field/field';
import { NxIconButton } from '../icon-button/icon-button';
import { NxIcon } from '../icon/icon';

@Component({
  selector: 'nx-password-input',
  imports: [NxIcon, NxIconButton, TranslocoPipe],
  template: `
    <div class="nx-input-group">
      <input
        #control
        class="nx-input"
        [type]="visible() ? 'text' : 'password'"
        [id]="field?.controlId"
        [value]="value()"
        [disabled]="disabled()"
        [attr.name]="name() || null"
        [attr.autocomplete]="autocomplete()"
        [attr.aria-describedby]="field?.describedBy() ?? null"
        [attr.aria-invalid]="field?.invalid() ? 'true' : null"
        (input)="value.set(control.value)"
        (blur)="touch.emit()"
      />
      <button
        type="button"
        nx-icon-button
        size="sm"
        class="toggle"
        [label]="(visible() ? 'ui.hidePassword' : 'ui.showPassword') | transloco"
        [attr.aria-pressed]="visible()"
        [disabled]="disabled()"
        (click)="visible.set(!visible())"
      >
        <svg nx-icon [icon]="visible() ? hideIcon : showIcon" size="18"></svg>
      </button>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .toggle {
      margin-right: -6px;
      color: var(--nx-text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxPasswordInput implements FormValueControl<string> {
  readonly value = model('');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly name = input('');
  readonly autocomplete = input<'current-password' | 'new-password'>('current-password');
  readonly touch = output();

  protected readonly field = inject(NxField, { optional: true });
  protected readonly visible = signal(false);
  protected readonly showIcon = Eye;
  protected readonly hideIcon = EyeOff;
}
