import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Trash2 } from 'lucide';
import { NxAlert } from '@shared/ui/alert/alert';
import { NxButton } from '@shared/ui/button/button';
import { NxCard, NxCardHeader } from '@shared/ui/card/card';
import { NxSwitch } from '@shared/ui/choice/choice';
import { NxDialog } from '@shared/ui/dialog/dialog';
import { NxErrorState } from '@shared/ui/feedback-state/feedback-state';
import { NxField, NxInput } from '@shared/ui/field/field';
import { NxIcon } from '@shared/ui/icon/icon';
import { NxSkeleton } from '@shared/ui/skeleton/skeleton';
import { ToastService } from '@shared/ui/toast/toast';
import { injectActiveLanguage } from '@shared/util/active-language';
import { OrganizationService } from '../../../application/organization.service';
import {
  type CalendarEvent,
  EVENT_LOCATION_MAX,
  EVENT_TITLE_MAX,
  addDays,
  combine,
  compareEvents,
  localDay,
  localTime,
  occursOn,
  parseDay,
} from '../../../domain/calendar';
import {
  type OrganizationErrorCode,
  toOrganizationError,
} from '../../../domain/organization-error';
import { isOpen } from '../../../domain/task';
import { longDay, timeRange } from '../../organization-format';

interface EventModel {
  title: string;
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  description: string;
  taskId: string;
}

const DAY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function eventRange(
  model: Pick<EventModel, 'allDay' | 'startDate' | 'startTime' | 'endDate' | 'endTime'>,
): {
  start: Date;
  end: Date;
} {
  if (model.allDay) {
    return {
      start: combine(model.startDate, '00:00'),
      end: combine(addDays(model.endDate || model.startDate, 1), '00:00'),
    };
  }
  return {
    start: combine(model.startDate, model.startTime || '00:00'),
    end: combine(model.endDate || model.startDate, model.endTime || '00:00'),
  };
}

@Component({
  selector: 'nx-event-form-page',
  imports: [
    FormField,
    NxAlert,
    NxButton,
    NxCard,
    NxCardHeader,
    NxDialog,
    NxErrorState,
    NxField,
    NxIcon,
    NxInput,
    NxSkeleton,
    NxSwitch,
    RouterLink,
    TranslocoPipe,
  ],
  templateUrl: './event-form-page.html',
  styleUrl: './event-form-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventFormPage {
  readonly id = input<string>();
  readonly date = input<string>();

  private readonly organization = inject(OrganizationService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly language = injectActiveLanguage();

  protected readonly removeIcon = Trash2;

  protected readonly existing = resource({
    params: () => this.id() || undefined,
    loader: ({ params }) => this.organization.event(params),
  });

  protected readonly tasks = resource({
    params: () => ({ version: this.organization.version() }),
    loader: () => this.organization.tasks(),
  });

  protected readonly model = signal<EventModel>(this.defaults(localDay(new Date())));

  protected readonly draft = form(this.model, (path) => {
    required(path.title);
    maxLength(path.title, EVENT_TITLE_MAX);
    maxLength(path.location, EVENT_LOCATION_MAX);
    required(path.startDate);
    validate(path.endTime, ({ valueOf }) => {
      const model = {
        allDay: valueOf(path.allDay),
        startDate: valueOf(path.startDate),
        startTime: valueOf(path.startTime),
        endDate: valueOf(path.endDate),
        endTime: valueOf(path.endTime),
      };
      if (!model.startDate) {
        return undefined;
      }
      const { start, end } = eventRange(model);
      return end.getTime() > start.getTime() ? undefined : { kind: 'endBeforeStart' };
    });
  });

  protected readonly taskOptions = computed(() => {
    const current = this.model().taskId;
    return this.tasks.hasValue()
      ? this.tasks.value().filter((task) => isOpen(task) || task.id === current)
      : [];
  });

  protected readonly sameDay = resource({
    params: () => {
      const day = this.model().startDate;
      return DAY_PATTERN.test(day) ? { day, version: this.organization.version() } : undefined;
    },
    loader: async ({ params }) => {
      const events = await this.organization.events(
        parseDay(params.day),
        parseDay(addDays(params.day, 1)),
      );
      return events
        .filter((event) => event.id !== this.id() && occursOn(event, params.day))
        .sort(compareEvents);
    },
  });

  protected readonly error = signal<OrganizationErrorCode | null>(null);
  protected readonly removeOpen = signal(false);
  protected readonly removing = signal(false);

  constructor() {
    effect(() => {
      const date = this.date();
      if (!this.id() && date && DAY_PATTERN.test(date)) {
        untracked(() => this.model.set(this.defaults(date)));
      }
    });
    effect(() => {
      if (this.existing.hasValue()) {
        const event = this.existing.value();
        untracked(() => this.load(event));
      }
    });
  }

  protected dayTitle(): string {
    const day = this.model().startDate;
    return DAY_PATTERN.test(day) ? longDay(day, this.language()) : '';
  }

  protected range(event: CalendarEvent): string {
    return event.allDay
      ? this.transloco.translate('organization.calendar.allDay')
      : timeRange(event.startsAt, event.endsAt, this.language());
  }

  protected backUrl(): string {
    const day = this.model().startDate;
    return DAY_PATTERN.test(day)
      ? `/app/organization/calendar?day=${day}`
      : '/app/organization/calendar';
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(null);
    await submit(this.draft, async () => {
      const value = this.model();
      const { start, end } = eventRange(value);
      try {
        await this.organization.saveEvent(this.id() ?? null, {
          title: value.title,
          description: value.description,
          location: value.location,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          allDay: value.allDay,
          taskId: value.taskId || null,
        });
        this.toast.success(
          this.transloco.translate(
            this.id() ? 'organization.event.updated' : 'organization.event.created',
          ),
        );
        await this.router.navigateByUrl(this.backUrl());
      } catch (error) {
        this.error.set(toOrganizationError(error).code);
      }
      return undefined;
    });
  }

  protected async remove(): Promise<void> {
    const id = this.id();
    if (!id) {
      return;
    }
    this.removing.set(true);
    try {
      await this.organization.removeEvent(id);
      this.removeOpen.set(false);
      this.toast.success(this.transloco.translate('organization.event.deleted'));
      await this.router.navigateByUrl(this.backUrl());
    } catch (error) {
      this.removeOpen.set(false);
      this.error.set(toOrganizationError(error).code);
    } finally {
      this.removing.set(false);
    }
  }

  private defaults(day: string): EventModel {
    return {
      title: '',
      allDay: false,
      startDate: day,
      startTime: '09:00',
      endDate: day,
      endTime: '10:00',
      location: '',
      description: '',
      taskId: '',
    };
  }

  private load(event: CalendarEvent): void {
    const start = new Date(event.startsAt);
    const end = new Date(event.endsAt);
    const lastDay = event.allDay ? new Date(end.getTime() - 1) : end;
    this.model.set({
      title: event.title,
      allDay: event.allDay,
      startDate: localDay(start),
      startTime: event.allDay ? '09:00' : localTime(start),
      endDate: localDay(lastDay),
      endTime: event.allDay ? '10:00' : localTime(end),
      location: event.location ?? '',
      description: event.description ?? '',
      taskId: event.taskId ?? '',
    });
  }
}
