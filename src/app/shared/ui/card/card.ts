import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type CardVariant = 'default' | 'muted' | 'highlight';

@Component({
  selector: 'nx-card, a[nx-card]',
  template: '<ng-content />',
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-width: 0;
      padding: var(--nx-card-padding, 20px);
      border: 1px solid var(--nx-border);
      border-radius: 24px;
      background: var(--nx-surface);
      color: var(--nx-text);
      text-decoration: none;
    }
    :host(.muted) {
      border-color: transparent;
      background: var(--nx-sand-100);
    }
    :host(.highlight) {
      border-color: var(--nx-navy-900);
      background: var(--nx-navy-900);
      color: var(--nx-text-inverse);
    }
    :host(a) {
      transition:
        border-color var(--nx-duration) var(--nx-ease),
        box-shadow var(--nx-duration) var(--nx-ease);
    }
    :host(a:hover) {
      border-color: var(--nx-border-strong);
      box-shadow: var(--nx-shadow-md);
    }
  `,
  host: { '[class]': 'variant()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxCard {
  readonly variant = input<CardVariant>('default');
}

@Component({
  selector: 'nx-card-header',
  template: `
    @if (level() === 3) {
      <h3 class="title">{{ heading() }}</h3>
    } @else {
      <h2 class="title">{{ heading() }}</h2>
    }
    <ng-content />
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }
    .title {
      flex: 1;
      min-width: 0;
      font-size: var(--nx-text-base);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxCardHeader {
  readonly heading = input.required<string>();
  readonly level = input<2 | 3>(2);
}
