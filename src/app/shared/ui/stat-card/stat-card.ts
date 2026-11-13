import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowRight, MoveRight, TrendingDown, TrendingUp } from 'lucide';
import { NxCard } from '../card/card';
import { NxSkeleton } from '../skeleton/skeleton';
import { NxIcon } from '../icon/icon';

export interface StatTrend {
  readonly direction: 'up' | 'down' | 'flat';
  readonly text: string;
  readonly tone: 'positive' | 'negative' | 'neutral';
}

@Component({
  selector: 'nx-stat-card',
  imports: [NxIcon, NxCard, NxSkeleton, RouterLink],
  template: `
    <nx-card [variant]="variant()" [attr.aria-busy]="loading() ? 'true' : null">
      <p class="label">{{ label() }}</p>
      @if (loading()) {
        <nx-skeleton variant="line" class="value-skeleton" />
        <nx-skeleton variant="line" class="trend-skeleton" />
      } @else {
        <p class="value">{{ value() ?? '—' }}</p>
        @if (trend(); as trend) {
          <p class="trend" [class]="trend.tone">
            <svg nx-icon [icon]="trendIcon()" size="16"></svg>
            {{ trend.text }}
          </p>
        }
      }
      @if (link(); as link) {
        <a class="link" [routerLink]="link">
          {{ linkLabel() }}
          <svg nx-icon [icon]="arrowIcon" size="14"></svg>
        </a>
      }
    </nx-card>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
      container-type: inline-size;
    }
    nx-card {
      height: 100%;
      gap: var(--nx-space-2);
    }
    .label {
      font-size: var(--nx-text-sm);
      font-weight: 500;
      opacity: 0.75;
    }
    .value {
      font-size: clamp(1.125rem, 14cqi, var(--nx-text-3xl));
      font-weight: 600;
      letter-spacing: -0.02em;
      line-height: 1.1;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .trend {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: var(--nx-text-sm);
      font-weight: 500;
    }
    .positive {
      color: var(--nx-success);
    }
    .negative {
      color: var(--nx-danger);
    }
    .neutral {
      color: var(--nx-text-muted);
    }
    nx-card.highlight .trend {
      color: var(--nx-accent);
    }
    .value-skeleton {
      width: 60%;
      height: 36px;
    }
    .trend-skeleton {
      width: 40%;
    }
    .link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: auto;
      padding-top: var(--nx-space-2);
      color: var(--nx-accent-strong);
      font-size: var(--nx-text-sm);
      font-weight: 600;
      text-decoration: none;
    }
    nx-card.highlight .link {
      color: var(--nx-accent);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxStatCard {
  readonly label = input.required<string>();
  readonly value = input<string | null>(null);
  readonly trend = input<StatTrend | null>(null);
  readonly variant = input<'default' | 'highlight'>('default');
  readonly loading = input(false, { transform: booleanAttribute });
  readonly link = input<string | null>(null);
  readonly linkLabel = input('');

  protected readonly arrowIcon = ArrowRight;
  protected readonly trendIcon = computed(() => {
    switch (this.trend()?.direction) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      default:
        return MoveRight;
    }
  });
}
