import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CalendarArrowDown, Download, MapPin, Plus, Upload } from 'lucide';
import { injectMediaQuery } from '@core/layout/media-query';
import { Session } from '@core/session/session';
import { NxButton } from '@shared/ui/button/button';
import { NxCard, NxCardHeader } from '@shared/ui/card/card';
import { NxErrorState } from '@shared/ui/feedback-state/feedback-state';
import { NxIcon } from '@shared/ui/icon/icon';
import { NxIconButton } from '@shared/ui/icon-button/icon-button';
import { NxMenu, NxMenuItem, NxMenuTrigger } from '@shared/ui/menu/menu';
import { NxMonthPicker } from '@shared/ui/month-picker/month-picker';
import { NxSkeleton } from '@shared/ui/skeleton/skeleton';
import { ToastService } from '@shared/ui/toast/toast';
import { injectActiveLanguage, localeFor } from '@shared/util/active-language';
import { downloadFile } from '@shared/util/download';
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
import { eventsToIcs } from '../../../domain/ics';
import { toOrganizationError } from '../../../domain/organization-error';
import { type Task, compareTasks } from '../../../domain/task';
import { NxImportEventsDialog } from '../../components/import-events-dialog';
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
    NxIconButton,
    NxImportEventsDialog,
    NxMenu,
    NxMenuItem,
    NxMenuTrigger,
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
  private readonly session = inject(Session);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);
  protected readonly compact = injectMediaQuery('(max-width: 767.98px)');

  protected readonly icons = {
    plus: Plus,
    location: MapPin,
    io: CalendarArrowDown,
    download: Download,
    upload: Upload,
  };
  protected readonly importOpen = signal(false);
  protected readonly exporting = signal(false);
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

  protected readonly grid = computed(() =>
    monthGrid(this.current(), this.session.user()?.weekStartsOn ?? 1),
  );

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

  protected async exportIcs(): Promise<void> {
    if (this.exporting()) {
      return;
    }
    this.exporting.set(true);
    try {
      const events = await this.organization.allEvents();
      if (events.length === 0) {
        this.toast.info(this.transloco.translate('organization.io.nothingToExport'));
        return;
      }
      downloadFile(
        this.document,
        `${this.transloco.translate('organization.io.fileName')}.ics`,
        eventsToIcs(events, new Date()),
        'text/calendar;charset=utf-8',
      );
      this.toast.success(
        this.transloco.translate('organization.io.exported', { count: events.length }),
      );
    } catch (error) {
      this.toast.error(
        this.transloco.translate(`organization.errors.${toOrganizationError(error).code}`),
      );
    } finally {
      this.exporting.set(false);
    }
  }

  private navigate(params: Record<string, string | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }
}
