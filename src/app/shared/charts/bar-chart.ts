import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface ChartSeries {
  readonly label: string;
  readonly color: string;
}

export interface BarGroup {
  readonly label: string;
  readonly values: readonly number[];
}

const WIDTH = 640;
const HEIGHT = 240;
const PADDING = { top: 12, right: 8, bottom: 28, left: 56 };
const TICKS = 4;

export function niceStep(value: number): number {
  if (value <= 0) {
    return 1;
  }
  const exponent = 10 ** Math.floor(Math.log10(value));
  const fraction = value / exponent;
  const step = [1, 2, 2.5, 5, 10].find((candidate) => fraction <= candidate) ?? 10;
  return step * exponent;
}

export function niceMax(value: number, ticks = 4): number {
  return niceStep(value / ticks) * ticks;
}

@Component({
  selector: 'nx-bar-chart',
  template: `
    <svg
      class="chart"
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      @for (tick of ticks(); track tick.value) {
        <line
          class="grid"
          [attr.x1]="left"
          [attr.x2]="width - right"
          [attr.y1]="tick.y"
          [attr.y2]="tick.y"
        />
        <text class="axis" [attr.x]="left - 8" [attr.y]="tick.y + 4" text-anchor="end">
          {{ tick.label }}
        </text>
      }
      @for (group of layout(); track group.label) {
        @for (bar of group.bars; track $index) {
          <rect
            class="bar"
            [attr.x]="bar.x"
            [attr.y]="bar.y"
            [attr.width]="bar.width"
            [attr.height]="bar.height"
            [attr.fill]="bar.color"
            rx="5"
            [style.animation-delay]="bar.delay"
          >
            <title>{{ bar.title }}</title>
          </rect>
        }
        <text class="axis" [attr.x]="group.center" [attr.y]="height - 8" text-anchor="middle">
          {{ group.label }}
        </text>
      }
    </svg>
    <div class="legend" aria-hidden="true">
      @for (item of series(); track item.label) {
        <span><i [style.background]="item.color"></i>{{ item.label }}</span>
      }
    </div>
    <table class="nx-visually-hidden">
      <caption>
        {{
          caption()
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">{{ categoryHeader() }}</th>
          @for (item of series(); track item.label) {
            <th scope="col">{{ item.label }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (group of groups(); track group.label) {
          <tr>
            <th scope="row">{{ group.label }}</th>
            @for (value of group.values; track $index) {
              <td>{{ format()(value) }}</td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--nx-space-3);
    }
    .chart {
      width: 100%;
      height: auto;
      overflow: visible;
    }
    .grid {
      stroke: var(--nx-surface-muted);
      stroke-width: 1;
    }
    .axis {
      fill: var(--nx-text-muted);
      font-size: 11px;
      font-variant-numeric: tabular-nums;
    }
    .bar {
      transform-box: fill-box;
      transform-origin: bottom;
      animation: grow 600ms var(--nx-ease) both;
    }
    .legend {
      display: flex;
      gap: var(--nx-space-4);
      color: var(--nx-text-muted);
      font-size: var(--nx-text-xs);
    }
    .legend span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .legend i {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    @keyframes grow {
      from {
        transform: scaleY(0);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxBarChart {
  readonly series = input.required<readonly ChartSeries[]>();
  readonly groups = input.required<readonly BarGroup[]>();
  readonly caption = input.required<string>();
  readonly categoryHeader = input('');
  readonly format = input<(value: number) => string>((value) => String(value));
  readonly formatAxis = input<((value: number) => string) | null>(null);

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly left = PADDING.left;
  protected readonly right = PADDING.right;

  private readonly max = computed(() =>
    niceMax(Math.max(0, ...this.groups().flatMap((group) => group.values)), TICKS),
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
    const groups = this.groups();
    const series = this.series();
    const plotWidth = WIDTH - PADDING.left - PADDING.right;
    const slot = plotWidth / Math.max(groups.length, 1);
    const gap = 4;
    const barWidth = Math.min(22, (slot * 0.62 - gap * (series.length - 1)) / series.length);
    const groupWidth = barWidth * series.length + gap * (series.length - 1);
    const format = this.format();
    return groups.map((group, index) => {
      const start = PADDING.left + slot * index + (slot - groupWidth) / 2;
      return {
        label: group.label,
        center: PADDING.left + slot * index + slot / 2,
        bars: group.values.map((value, position) => {
          const y = this.y(value);
          return {
            x: start + position * (barWidth + gap),
            y,
            width: barWidth,
            height: Math.max(0, HEIGHT - PADDING.bottom - y),
            color: series[position]?.color ?? 'currentColor',
            delay: `${index * 50 + position * 25}ms`,
            title: `${series[position]?.label ?? ''} · ${group.label}: ${format(value)}`,
          };
        }),
      };
    });
  });
}
