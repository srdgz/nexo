import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type LogoVariant = 'full' | 'mark' | 'inverse';

@Component({
  selector: 'nx-logo',
  template: `
    <svg class="mark" viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="13" [attr.fill]="tile()" />
      <path
        d="M15 33V15l18 18V15"
        fill="none"
        [attr.stroke]="stroke()"
        stroke-width="5.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle cx="15" cy="33" r="5" fill="#91A995" [attr.stroke]="tile()" stroke-width="2.5" />
      <circle cx="33" cy="15" r="5" fill="#91A995" [attr.stroke]="tile()" stroke-width="2.5" />
    </svg>
    @if (variant() !== 'mark') {
      <span class="word" aria-hidden="true">nexo</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.5em;
      color: var(--nx-navy-900);
      font-size: var(--nx-text-xl);
    }
    :host(.inverse) {
      color: var(--nx-text-inverse);
    }
    .mark {
      width: var(--nx-logo-size, 34px);
      height: var(--nx-logo-size, 34px);
      flex: none;
    }
    .word {
      font-family: var(--nx-font-heading);
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1;
    }
  `,
  host: {
    role: 'img',
    'aria-label': 'NEXO',
    '[class]': 'variant()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxLogo {
  readonly variant = input<LogoVariant>('full');

  protected readonly tile = computed(() => (this.variant() === 'inverse' ? '#F7F6F2' : '#182B35'));
  protected readonly stroke = computed(() =>
    this.variant() === 'inverse' ? '#182B35' : '#F7F6F2',
  );
}
