import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { niceMax } from './bar-chart';

export interface LollipopPoint {
  readonly label: string;
  readonly title: string;
  readonly value: number;
  readonly future?: boolean;
  readonly highlight?: boolean;
  readonly showLabel?: boolean;
}

const WIDTH = 560;
const MIN_WIDTH = 260;
const HEIGHT = 190;
const PADDING = { top: 30, right: 10, bottom: 26, left: 52 };
const TICKS = 3;

@Component({
  selector: 'nx-lollipop-chart',
  template: `
    <svg class="chart" [attr.viewBox]="'0 0 ' + width() + ' ' + height" aria-hidden="true">
      @for (tick of ticks(); track tick.value) {
        <line
          class="grid"
          [class.base]="tick.value === 0"
          [attr.x1]="left"
          [attr.x2]="width() - right"
          [attr.y1]="tick.y"
          [attr.y2]="tick.y"
        />
        <text class="axis" [attr.x]="left - 8" [attr.y]="tick.y + 4" text-anchor="end">
          {{ tick.label }}
        </text>
      }
      @for (point of layout(); track $index) {
        @if (point.future) {
          <circle class="future" [attr.cx]="point.x" [attr.cy]="base" r="2.2" />
        } @else {
          <line
            class="stick"
            [class.highlight]="point.highlight"
            [attr.x1]="point.x"
            [attr.x2]="point.x"
            [attr.y1]="base"
            [attr.y2]="point.y"
            [style.animation-delay]="point.delay"
          />
          <circle
            class="head"
            [class.highlight]="point.highlight"
            [attr.cx]="point.x"
            [attr.cy]="point.y"
            [attr.r]="point.highlight ? 6 : 4.5"
            [style.animation-delay]="point.delay"
          >
            <title>{{ point.title }}</title>
          </circle>
        }
        @if (point.showLabel || point.highlight) {
          <text
            class="axis"
            [class.strong]="point.highlight"
            [attr.x]="point.x"
            [attr.y]="height - 6"
            text-anchor="middle"
          >
            {{ point.label }}
          </text>
        }
      }
      @if (badge(); as badge) {
        <g class="badge">
          <rect
            [attr.x]="badge.x - badge.width / 2"
            [attr.y]="badge.y"
            [attr.width]="badge.width"
            height="24"
            rx="12"
          />
          <text [attr.x]="badge.x" [attr.y]="badge.y + 16" text-anchor="middle">
            {{ badge.text }}
          </text>
        </g>
      }
    </svg>
    <table class="nx-visually-hidden">
      <caption>
        {{
          caption()
        }}
      </caption>
      <tbody>
        @for (point of points(); track $index) {
          @if (!point.future) {
            <tr>
              <th scope="row">{{ point.title }}</th>
              <td>{{ format()(point.value) }}</td>
            </tr>
          }
        }
      </tbody>
    </table>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .chart {
      width: 100%;
      height: auto;
      overflow: visible;
    }
    .grid {
      stroke: #ece8df;
      stroke-dasharray: 3 4;
    }
    .grid.base {
      stroke-dasharray: none;
    }
    .axis {
      fill: var(--nx-text-muted);
      font-size: 11px;
      font-variant-numeric: tabular-nums;
    }
    .axis.strong {
      fill: var(--nx-navy-900);
      font-weight: 700;
    }
    .future {
      fill: #d9d4c8;
    }
    .stick {
      stroke: #c9d5cb;
      stroke-width: 2.5;
      stroke-linecap: round;
      transform-box: fill-box;
      transform-origin: bottom;
      animation: grow 500ms var(--nx-ease) both;
    }
    .stick.highlight {
      stroke: var(--nx-navy-900);
    }
    .head {
      fill: var(--nx-sage-500);
      stroke: #fff;
      stroke-width: 2;
      animation: pop 400ms var(--nx-ease) both;
    }
    .head.highlight {
      fill: var(--nx-navy-900);
    }
    .badge rect {
      fill: var(--nx-navy-900);
    }
    .badge text {
      fill: var(--nx-text-inverse);
      font-size: 12px;
      font-weight: 600;
    }
    @keyframes grow {
      from {
        transform: scaleY(0);
      }
    }
    @keyframes pop {
      from {
        opacity: 0;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxLollipopChart {
  readonly points = input.required<readonly LollipopPoint[]>();
  readonly caption = input.required<string>();
  readonly badgeText = input('');
  readonly format = input<(value: number) => string>((value) => String(value));
  readonly formatAxis = input<((value: number) => string) | null>(null);

  protected readonly width = signal(WIDTH);
  protected readonly height = HEIGHT;
  protected readonly left = PADDING.left;
  protected readonly right = PADDING.right;
  protected readonly base = HEIGHT - PADDING.bottom;

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(() => {
        const width = Math.round(host.clientWidth);
        if (width > 0) {
          this.width.set(Math.max(MIN_WIDTH, width));
        }
      });
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  private readonly max = computed(() =>
    niceMax(Math.max(0, ...this.points().map((point) => point.value)), TICKS),
  );

  private y(value: number): number {
    const plot = HEIGHT - PADDING.top - PADDING.bottom;
    return PADDING.top + plot - (value / this.max()) * plot;
  }

  protected readonly ticks = computed(() => {
    const format = this.formatAxis() ?? this.format();
    return Array.from({ length: TICKS + 1 }, (_, index) => {
      const value = (this.max() / TICKS) * index;
      return { value, y: this.y(value), label: format(value) };
    });
  });

  protected readonly layout = computed(() => {
    const points = this.points();
    const step = (this.width() - PADDING.left - PADDING.right) / Math.max(points.length, 1);
    const x = (index: number) => PADDING.left + step * (index + 0.5);
    const highlighted = points.findIndex((point) => point.highlight);
    return points.map((point, index) => ({
      ...point,
      showLabel: point.showLabel && (highlighted < 0 || Math.abs(x(index) - x(highlighted)) >= 22),
      x: x(index),
      y: this.y(point.value),
      delay: `${index * 18}ms`,
    }));
  });

  protected readonly badge = computed(() => {
    const text = this.badgeText();
    const point = this.layout().find((item) => item.highlight && !item.future);
    if (!text || !point) {
      return null;
    }
    const width = Math.max(80, text.length * 7 + 20);
    const x = Math.min(
      Math.max(point.x, PADDING.left + width / 2),
      this.width() - PADDING.right - width / 2,
    );
    return { x, y: Math.max(0, point.y - 36), width, text };
  });
}
