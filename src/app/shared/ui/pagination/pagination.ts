import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ChevronLeft, ChevronRight } from 'lucide';
import { NxIcon } from '../icon/icon';
import { NxIconButton } from '../icon-button/icon-button';

export function visiblePages(current: number, count: number): (number | null)[] {
  if (count <= 7) {
    return Array.from({ length: count }, (_, index) => index + 1);
  }
  const pages = new Set([1, count, current - 1, current, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= count).sort((a, b) => a - b);
  const result: (number | null)[] = [];
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) {
      result.push(null);
    }
    result.push(page);
  });
  return result;
}

@Component({
  selector: 'nx-pagination',
  imports: [NxIcon, NxIconButton, TranslocoPipe],
  template: `
    <p class="range">
      {{ 'ui.pagination.range' | transloco: { from: from(), to: to(), total: total() } }}
    </p>
    @if (count() > 1) {
      <div class="pages">
        <button
          type="button"
          nx-icon-button
          variant="outline"
          size="sm"
          [label]="'ui.pagination.previous' | transloco"
          [disabled]="page() <= 1"
          (click)="pageChange.emit(page() - 1)"
        >
          <svg nx-icon [icon]="icons.previous" size="16"></svg>
        </button>
        @for (item of pages(); track $index) {
          @if (item === null) {
            <span class="gap" aria-hidden="true">…</span>
          } @else {
            <button
              type="button"
              class="page"
              [class.current]="item === page()"
              [attr.aria-current]="item === page() ? 'page' : null"
              [attr.aria-label]="'ui.pagination.page' | transloco: { page: item }"
              (click)="pageChange.emit(item)"
            >
              {{ item }}
            </button>
          }
        }
        <button
          type="button"
          nx-icon-button
          variant="outline"
          size="sm"
          [label]="'ui.pagination.next' | transloco"
          [disabled]="page() >= count()"
          (click)="pageChange.emit(page() + 1)"
        >
          <svg nx-icon [icon]="icons.next" size="16"></svg>
        </button>
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--nx-space-3);
    }
    .range {
      color: var(--nx-text-muted);
      font-size: var(--nx-text-sm);
      font-variant-numeric: tabular-nums;
    }
    .pages {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .page {
      min-width: 32px;
      height: 32px;
      padding: 0 8px;
      border-radius: var(--nx-radius-pill);
      font-size: var(--nx-text-sm);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .page:hover {
      background: var(--nx-surface-muted);
    }
    .page.current {
      background: var(--nx-navy-900);
      color: var(--nx-text-inverse);
    }
    .gap {
      padding: 0 4px;
      color: var(--nx-text-muted);
    }
  `,
  host: { role: 'navigation', '[attr.aria-label]': 'label()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxPagination {
  readonly page = input.required<number>();
  readonly total = input.required<number>();
  readonly pageSize = input(20);
  readonly label = input('');
  readonly pageChange = output<number>();

  protected readonly icons = { previous: ChevronLeft, next: ChevronRight };
  protected readonly count = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  protected readonly from = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1,
  );
  protected readonly to = computed(() => Math.min(this.total(), this.page() * this.pageSize()));
  protected readonly pages = computed(() => visiblePages(this.page(), this.count()));
}
