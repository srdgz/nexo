import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import { CircleAlert } from 'lucide';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { injectActiveLanguage } from '../../util/active-language';
import { uniqueId } from '../../util/unique-id';
import { NxIcon } from '../icon/icon';

export interface FieldError {
  readonly kind: string;
  readonly message?: string;
}

export interface FieldStatus {
  invalid(): boolean;
  touched(): boolean;
  errors(): readonly FieldError[];
}

@Component({
  selector: 'nx-field',
  imports: [NxIcon, TranslocoPipe],
  template: `
    <label class="label" [attr.for]="controlId">
      {{ label() }}
      @if (optional()) {
        <span class="optional">{{ 'ui.optional' | transloco }}</span>
      }
    </label>
    <ng-content />
    @if (errorText(); as error) {
      <p class="error" [id]="errorId">
        <svg nx-icon [icon]="errorIcon" size="14"></svg>
        {{ error }}
      </p>
    } @else if (hint()) {
      <p class="hint" [id]="hintId">{{ hint() }}</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }
    .label {
      font-size: var(--nx-text-sm);
      font-weight: 600;
    }
    .optional {
      margin-left: var(--nx-space-1);
      color: var(--nx-text-muted);
      font-weight: 400;
    }
    .hint,
    .error {
      font-size: var(--nx-text-xs);
    }
    .hint {
      color: var(--nx-text-muted);
    }
    .error {
      display: flex;
      align-items: center;
      gap: 5px;
      color: var(--nx-danger);
      font-weight: 500;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxField {
  readonly label = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly state = input<FieldStatus | null>(null);
  readonly optional = input(false, { transform: booleanAttribute });

  readonly controlId = uniqueId('nx-control');
  protected readonly hintId = `${this.controlId}-hint`;
  protected readonly errorId = `${this.controlId}-error`;
  protected readonly errorIcon = CircleAlert;

  private readonly transloco = inject(TranslocoService);
  private readonly language = injectActiveLanguage();

  readonly errorText = computed(() => {
    const explicit = this.error();
    if (explicit) {
      return explicit;
    }
    const state = this.state();
    if (!state?.touched() || !state.invalid()) {
      return null;
    }
    const [first] = state.errors();
    if (!first) {
      return null;
    }
    this.language();
    return first.message ?? this.transloco.translate(`ui.errors.${first.kind}`, { ...first });
  });

  readonly invalid = computed(() => this.errorText() !== null);

  readonly describedBy = computed(() => {
    if (this.errorText()) {
      return this.errorId;
    }
    return this.hint() ? this.hintId : null;
  });
}

@Directive({
  selector: 'input[nxInput], textarea[nxInput], select[nxInput]',
  host: {
    class: 'nx-input',
    '[id]': 'resolvedId()',
    '[attr.aria-describedby]': 'field?.describedBy() ?? null',
    '[attr.aria-invalid]': 'field?.invalid() ? "true" : null',
  },
})
export class NxInput {
  readonly id = input<string>();

  protected readonly field = inject(NxField, { optional: true });
  protected readonly resolvedId = computed(() => this.id() ?? this.field?.controlId ?? null);
}
