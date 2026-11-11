import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SkeletonVariant = 'line' | 'card' | 'list-row' | 'chart';

@Component({
  selector: 'nx-skeleton',
  template: `
    @switch (variant()) {
      @case ('list-row') {
        <span class="block tile"></span>
        <span class="lines">
          <span class="block line"></span>
          <span class="block line short"></span>
        </span>
        <span class="block line amount"></span>
      }
      @case ('chart') {
        @for (height of bars; track $index) {
          <span class="block bar" [style.height.%]="height"></span>
        }
      }
      @default {
        <span class="block fill"></span>
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }
    :host(.line) {
      height: 14px;
    }
    :host(.card) {
      height: 160px;
    }
    :host(.list-row) {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
    }
    :host(.chart) {
      display: flex;
      align-items: flex-end;
      gap: 10px;
      height: 180px;
    }
    .block {
      display: block;
      border-radius: 8px;
      background: linear-gradient(
        90deg,
        var(--nx-surface-muted) 25%,
        #f8f6f1 50%,
        var(--nx-surface-muted) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.4s ease-in-out infinite;
    }
    .fill {
      width: 100%;
      height: 100%;
    }
    :host(.card) .fill {
      border-radius: 24px;
    }
    .tile {
      width: 36px;
      height: 36px;
      flex: none;
      border-radius: 12px;
    }
    .lines {
      display: grid;
      flex: 1;
      gap: 6px;
    }
    .line {
      height: 12px;
    }
    .short {
      width: 45%;
    }
    .amount {
      width: 64px;
      flex: none;
    }
    .bar {
      flex: 1;
    }
    @keyframes shimmer {
      from {
        background-position: 100% 0;
      }
      to {
        background-position: -100% 0;
      }
    }
  `,
  host: {
    'aria-hidden': 'true',
    '[class]': 'variant()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxSkeleton {
  readonly variant = input<SkeletonVariant>('line');

  protected readonly bars = [45, 70, 30, 85, 55, 65, 40];
}
