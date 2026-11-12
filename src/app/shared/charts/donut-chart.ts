import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface DonutSegment {
  readonly label: string;
  readonly value: number;
  readonly color: string;
}

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 1.6;

@Component({
  selector: 'nx-donut-chart',
  template: `
    <svg class="donut" viewBox="0 0 100 100" aria-hidden="true">
      <circle class="track" cx="50" cy="50" [attr.r]="radius" />
      @for (arc of arcs(); track arc.label) {
        <circle
          class="arc"
          cx="50"
          cy="50"
          [attr.r]="radius"
          [attr.stroke]="arc.color"
          [attr.stroke-dasharray]="arc.length + ' ' + circumference"
          [attr.stroke-dashoffset]="arc.offset"
        />
      }
    </svg>
    <div class="center">
      <span class="value">{{ centerValue() }}</span>
      <span class="label">{{ centerLabel() }}</span>
    </div>
    <table class="nx-visually-hidden">
      <caption>
        {{
          caption()
        }}
      </caption>
      <tbody>
        @for (segment of segments(); track segment.label) {
          <tr>
            <th scope="row">{{ segment.label }}</th>
            <td>{{ format()(segment.value) }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    :host {
      position: relative;
      display: grid;
      place-items: center;
      width: var(--size, 160px);
      aspect-ratio: 1;
    }
    .donut {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    .track {
      fill: none;
      stroke: var(--nx-surface-muted);
      stroke-width: 12;
    }
    .arc {
      fill: none;
      stroke-width: 12;
      stroke-linecap: butt;
      animation: draw 800ms var(--nx-ease) both;
    }
    .center {
      position: absolute;
      display: grid;
      justify-items: center;
      text-align: center;
    }
    .value {
      font-size: var(--nx-text-lg);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .label {
      color: var(--nx-text-muted);
      font-size: var(--nx-text-xs);
    }
    @keyframes draw {
      from {
        stroke-dasharray: 0 264;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxDonutChart {
  readonly segments = input.required<readonly DonutSegment[]>();
  readonly caption = input.required<string>();
  readonly centerValue = input('');
  readonly centerLabel = input('');
  readonly format = input<(value: number) => string>((value) => String(value));

  protected readonly radius = RADIUS;
  protected readonly circumference = CIRCUMFERENCE;

  protected readonly arcs = computed(() => {
    const segments = this.segments().filter((segment) => segment.value > 0);
    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    if (total === 0) {
      return [];
    }
    const gap = segments.length > 1 ? GAP : 0;
    let start = 0;
    return segments.map((segment) => {
      const share = (segment.value / total) * CIRCUMFERENCE;
      const arc = {
        label: segment.label,
        color: segment.color,
        length: Math.max(0, share - gap),
        offset: -start,
      };
      start += share;
      return arc;
    });
  });
}
