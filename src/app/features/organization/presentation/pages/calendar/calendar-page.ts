import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MapPin, Plus } from 'lucide';
import { injectMediaQuery } from '@core/layout/media-query';
import { NxButton } from '@shared/ui/button/button';
import { NxCard, NxCardHeader } from '@shared/ui/card/card';
import { NxErrorState } from '@shared/ui/feedback-state/feedback-state';
import { NxIcon } from '@shared/ui/icon/icon';
import { NxMonthPicker } from '@shared/ui/month-picker/month-picker';
import { NxSkeleton } from '@shared/ui/skeleton/skeleton';
import { injectActiveLanguage, localeFor } from '@shared/util/active-language';
import { OrganizationService } from '../../../application/organization.service';
import {
  type CalendarEvent,
  addDays,
  compareEvents,
  eventDays,
  localDay,
  monthGrid,
  parseDay,
} from '../../../domain/calendar';
import { type Task, compareTasks } from '../../../domain/task';
import { NxTaskCheck, NxTaskPaymentPrompt } from '../../components/task-check';
import { longDay, timeRange } from '../../organization-format';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const VISIBLE_ITEMS = 3;

type DayItem =
  | { readonly kind: 'event'; readonly event: CalendarEvent }
  | { readonly kind: 'task'; readonly task: Task };

@Component({
  selector: 'nx-calendar-page',
  imports: [
    NxButton,
    NxCard,
    NxCardHeader,
    NxErrorState,
    NxIcon,
    NxMonthPicker,
    NxSkeleton,
    NxTaskCheck,
    NxTaskPaymentPrompt,
    RouterLink,
    TranslocoPipe,
  ],
  templateUrl: './calendar-page.html',
  styleUrl: './calendar-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {
  readonly month = input<string>();
  readonly day = input<string>();

  private readonly organization = inject(OrganizationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly language = injectActiveLanguage();
  protected readonly compact = injectMediaQuery('(max-width: 767.98px)');

  protected readonly icons = { plus: Plus, location: MapPin };
  protected readonly today = localDay(new Date());
  protected readonly visibleItems = VISIBLE_ITEMS;

  protected readonly selected = computed(() => {
    const day = this.day();
    return day && DAY_PATTERN.test(day) ? day : this.today;
  });

  protected readonly current = computed(() => {
    const month = this.month();
    return month && MONTH_PATTERN.test(month) ? month : this.selected().slice(0, 7);
  });

  protected readonly grid = computed(() => monthGrid(this.current(), 1));

  protected readonly weekdays = computed(() => {
    const format = new Intl.DateTimeFormat(localeFor(this.language()), {
      weekday: this.compact() ? 'narrow' : 'short',
    });
    return this.grid()
      .slice(0, 7)
      .map((day) => format.format(parseDay(day.date)).replace('.', ''));
  });

  protected readonly events = resource({
    params: () => {
      const grid = this.grid();
      return {
        from: parseDay(grid[0]?.date ?? this.today),
        to: parseDay(addDays(grid.at(-1)?.date ?? this.today, 1)),
        version: this.organization.version(),
      };
    },
    loader: ({ params }) => this.organization.events(params.from, params.to),
  });

  protected readonly tasks = resource({
    params: () => ({ version: this.organization.version() }),
    loader: () => this.organization.tasks(),
  });

  private readonly itemsByDay = computed(() => {
    const map = new Map<string, DayItem[]>();
    const push = (day: string, item: DayItem) => map.set(day, [...(map.get(day) ?? []), item]);
    if (this.events.hasValue()) {
      for (const event of [...this.events.value()].sort(compareEvents)) {
        for (const day of eventDays(event)) {
          push(day, { kind: 'event', event });
        }
      }
    }
    if (this.tasks.hasValue()) {
      for (const task of [...this.tasks.value()].sort(compareTasks('priority'))) {
        if (task.dueDate) {
          push(task.dueDate, { kind: 'task', task });
        }
      }
    }
    return map;
  });

  protected readonly loading = computed(() => !this.events.hasValue() || !this.tasks.hasValue());

  protected readonly agenda = computed(() => this.itemsOn(this.selected()));

  protected itemsOn(day: string): readonly DayItem[] {
    return this.itemsByDay().get(day) ?? [];
  }

  protected dayTitle(day: string): string {
    return longDay(day, this.language());
  }

  protected range(event: CalendarEvent): string {
    return timeRange(event.startsAt, event.endsAt, this.language());
  }

  protected cellLabel(day: string): string {
    const count = this.itemsOn(day).length;
    return count > 0 ? `${this.dayTitle(day)}, ${count}` : this.dayTitle(day);
  }

  protected select(day: string): void {
    this.navigate({ day, month: day.slice(0, 7) });
  }

  protected changeMonth(month: string): void {
    this.navigate({ month, day: null });
  }

  protected goToday(): void {
    this.navigate({ month: null, day: null });
  }

  private navigate(params: Record<string, string | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }
}
