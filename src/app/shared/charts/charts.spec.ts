import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NxBarChart, niceMax } from './bar-chart';
import { NxDonutChart } from './donut-chart';

describe('niceMax', () => {
  it.each([
    [0, 4, 4],
    [3300, 4, 4000],
    [97850, 4, 100000],
    [5, 4, 8],
    [1200, 4, 2000],
  ])('rounds %s with %s ticks up to %s', (value, ticks, expected) => {
    expect(niceMax(value, ticks)).toBe(expected);
  });
});

@Component({
  imports: [NxBarChart, NxDonutChart],
  template: `
    <nx-bar-chart
      caption="Income and expenses"
      categoryHeader="Month"
      [series]="[
        { label: 'Income', color: 'navy' },
        { label: 'Expenses', color: 'sage' },
      ]"
      [groups]="[
        { label: 'oct', values: [3000, 1200] },
        { label: 'nov', values: [3200, 0] },
      ]"
      [format]="format"
    />
    <nx-donut-chart
      caption="By category"
      centerValue="100"
      [segments]="[
        { label: 'Housing', value: 75, color: 'navy' },
        { label: 'Food', value: 25, color: 'sage' },
        { label: 'Empty', value: 0, color: 'sand' },
      ]"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly format = (value: number) => `${value} €`;
}

describe('charts', () => {
  let root: HTMLElement;

  beforeEach(async () => {
    const fixture = TestBed.createComponent(Host);
    root = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('draws one bar per value and hides the drawing from screen readers', () => {
    const svg = root.querySelector('nx-bar-chart svg')!;

    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelectorAll('rect')).toHaveLength(4);
    expect(svg.querySelector('rect title')?.textContent).toBe('Income · oct: 3000 €');
  });

  it('offers an equivalent table', () => {
    const table = root.querySelector('nx-bar-chart table')!;
    const rows = Array.from(table.querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.children).map((cell) => cell.textContent?.trim()),
    );

    expect(table.querySelector('caption')?.textContent?.trim()).toBe('Income and expenses');
    expect(rows).toEqual([
      ['oct', '3000 €', '1200 €'],
      ['nov', '3200 €', '0 €'],
    ]);
  });

  it('splits the donut by share and skips empty segments', () => {
    const arcs = Array.from(root.querySelectorAll<SVGCircleElement>('nx-donut-chart .arc'));
    const lengths = arcs.map((arc) => Number(arc.getAttribute('stroke-dasharray')!.split(' ')[0]));

    expect(arcs).toHaveLength(2);
    expect(lengths[0]! / lengths[1]!).toBeCloseTo(3, 0);
    expect(root.querySelectorAll('nx-donut-chart tbody tr')).toHaveLength(3);
  });
});
