import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  output,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ChevronLeft, ChevronRight } from 'lucide';
import { injectActiveLanguage, localeFor } from '../../util/active-language';
import { NxIcon } from '../icon/icon';
import { NxIconButton } from '../icon-button/icon-button';

export function shiftMonth(month: string, amount: number): string {
  const [year, index] = month.split('-').map(Number) as [number, number];
  const date = new Date(year, index - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonth(month: string, language: string, short = false): string {
  const [year, index] = month.split('-').map(Number) as [number, number];
  const name = new Intl.DateTimeFormat(localeFor(language), {
    month: short ? 'short' : 'long',
  })
    .format(new Date(year, index - 1, 1))
    .replace('.', '');
  return `${name.charAt(0).toLocaleUpperCase()}${name.slice(1)} ${year}`;
}

export function formatMonthInline(month: string, language: string): string {
  const [year, index] = month.split('-').map(Number) as [number, number];
  return new Intl.DateTimeFormat(localeFor(language), { month: 'long', year: 'numeric' }).format(
    new Date(year, index - 1, 1),
  );
}

@Component({
  selector: 'nx-month-picker',
  imports: [NxIcon, NxIconButton, TranslocoPipe],
  template: `
    <button
      type="button"
      nx-icon-button
      size="sm"
      [label]="'ui.month.previous' | transloco"
      (click)="monthChange.emit(previous())"
    >
      <svg nx-icon [icon]="icons.previous" size="16"></svg>
    </button>
    <span class="label" aria-live="polite">{{ label() }}</span>
    <button
      type="button"
      nx-icon-button
      size="sm"
      [label]="'ui.month.next' | transloco"
      (click)="monthChange.emit(next())"
    >
      <svg nx-icon [icon]="icons.next" size="16"></svg>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 3px;
      border: 1px solid var(--nx-border);
      border-radius: var(--nx-radius-pill);
      background: var(--nx-surface);
    }
    .label {
      min-width: 9.5em;
      font-size: var(--nx-text-sm);
      font-weight: 600;
      text-align: center;
      white-space: nowrap;
    }
    :host(.compact) .label {
      min-width: 5.5em;
    }
  `,
  host: {
    role: 'group',
    '[attr.aria-label]': 'label()',
    '[class.compact]': 'compact()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxMonthPicker {
  readonly month = input.required<string>();
  readonly compact = input(false, { transform: booleanAttribute });
  readonly monthChange = output<string>();

  private readonly language = injectActiveLanguage();

  protected readonly icons = { previous: ChevronLeft, next: ChevronRight };
  protected readonly label = computed(() =>
    formatMonth(this.month(), this.language(), this.compact()),
  );
  protected readonly previous = computed(() => shiftMonth(this.month(), -1));
  protected readonly next = computed(() => shiftMonth(this.month(), 1));
}
