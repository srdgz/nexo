import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { injectActiveLanguage } from '../../util/active-language';
import { formatAmount, parseAmount } from '../../util/money';
import { NxField } from '../field/field';

@Component({
  selector: 'nx-money-input',
  template: `
    <div class="nx-input-group">
      <input
        #control
        class="nx-input amount"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        [id]="field?.controlId"
        [value]="text()"
        [disabled]="disabled()"
        [attr.name]="name() || null"
        [attr.placeholder]="placeholder()"
        [attr.aria-describedby]="field?.describedBy() ?? null"
        [attr.aria-invalid]="field?.invalid() ? 'true' : null"
        (input)="onInput(control.value)"
        (blur)="onBlur()"
      />
      <span class="suffix" aria-hidden="true">€</span>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .amount {
      font-variant-numeric: tabular-nums;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxMoneyInput implements FormValueControl<number | null> {
  readonly value = model<number | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly name = input('');
  readonly touch = output();

  protected readonly field = inject(NxField, { optional: true });
  private readonly language = injectActiveLanguage();
  private readonly draft = signal<string | null>(null);

  protected readonly placeholder = computed(() => formatAmount(0, this.language()));

  protected readonly text = computed(() => {
    const draft = this.draft();
    if (draft !== null) {
      return draft;
    }
    const cents = this.value();
    return cents === null ? '' : formatAmount(cents, this.language());
  });

  protected onInput(text: string): void {
    this.draft.set(text);
    this.value.set(parseAmount(text) ?? null);
  }

  protected onBlur(): void {
    this.draft.set(null);
    this.touch.emit();
  }
}
