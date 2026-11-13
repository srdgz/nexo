import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type LogoVariant = 'full' | 'mark' | 'inverse';

@Component({
  selector: 'nx-logo',
  template: `
    <svg class="mark" viewBox="0 0 48 48" aria-hidden="true">
      <rect class="tile" width="48" height="48" rx="13" />
      <path
        d="M15 33V15l18 18V15"
        class="ink"
        fill="none"
        stroke-width="5.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle cx="15" cy="33" r="5" class="node" stroke-width="2.5" />
      <circle cx="33" cy="15" r="5" class="node" stroke-width="2.5" />
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
      --logo-tile: var(--nx-text);
      --logo-ink: var(--nx-bg);
      color: var(--nx-text);
      font-size: var(--nx-text-xl);
    }
    :host(.inverse) {
      --logo-tile: var(--nx-on-inverse);
      --logo-ink: var(--nx-inverse);
      color: var(--nx-on-inverse);
    }
    .tile {
      fill: var(--logo-tile);
    }
    .ink {
      stroke: var(--logo-ink);
    }
    .node {
      fill: var(--nx-accent);
      stroke: var(--logo-tile);
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
}
