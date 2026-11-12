import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, ChartPie, Link2, MapPin } from 'lucide';
import { PageHeading } from '@core/layout/page-heading';
import { Session } from '@core/session/session';
import { CategoriesStore } from '@features/finances/application/categories.store';
import { FinanceService } from '@features/finances/application/finance.service';
import { budgetStatus, budgetUsage } from '@features/finances/domain/budget';
import { balanceOf, savingsRate, shareOf } from '@features/finances/domain/insights';
import { addMonths, toMonthKey } from '@features/finances/domain/month';
import { NxCategoryTile } from '@features/finances/presentation/components/category-tile';
import { OrganizationService } from '@features/organization/application/organization.service';
import { addDays, localDay, parseDay } from '@features/organization/domain/calendar';
import { type Task, compareTasks, isOpen } from '@features/organization/domain/task';
import { NxPriorityBadge } from '@features/organization/presentation/components/priority-badge';
import {
  NxTaskCheck,
  NxTaskPaymentPrompt,
} from '@features/organization/presentation/components/task-check';
import { dueKind } from '@features/organization/presentation/organization-format';
import { NxDonutChart } from '@shared/charts/donut-chart';
import { NxLollipopChart, type LollipopPoint } from '@shared/charts/lollipop-chart';
import { NxBadge } from '@shared/ui/badge/badge';
import { NxCard, NxCardHeader } from '@shared/ui/card/card';
import { NxChip } from '@shared/ui/chip/chip';
import { NxEmptyState, NxErrorState } from '@shared/ui/feedback-state/feedback-state';
import { NxIcon } from '@shared/ui/icon/icon';
import { formatMonthInline } from '@shared/ui/month-picker/month-picker';
import { NxProgress } from '@shared/ui/progress/progress';
import { NxSegmented, type SegmentedOption } from '@shared/ui/segmented/segmented';
import { NxSkeleton } from '@shared/ui/skeleton/skeleton';
import { injectActiveLanguage, localeFor } from '@shared/util/active-language';
import { formatMoney } from '@shared/util/money';
import {
  type SpendRange,
  compareSpend,
  daysLeft,
  firstName,
  greetingFor,
  monthState,
  plannedTotal,
  spendSeries,
  upcomingPayments,
} from '../domain/dashboard';

type TaskTab = 'all' | 'today' | 'high';

const CHART_COLORS = [
  'var(--nx-chart-1)',
  'var(--nx-chart-2)',
  'var(--nx-chart-3)',
  'var(--nx-chart-4)',
  'var(--nx-chart-5)',
];

@Component({
  selector: 'nx-dashboard-page',
  imports: [
    NxBadge,
    NxCard,
    NxCardHeader,
    NxCategoryTile,
    NxChip,
    NxDonutChart,
    NxEmptyState,
    NxErrorState,
    NxIcon,
    NxLollipopChart,
    NxPriorityBadge,
    NxProgress,
    NxSegmented,
    NxSkeleton,
    NxTaskCheck,
    NxTaskPaymentPrompt,
    RouterLink,
    TranslocoPipe,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  readonly month = input<string>();

  private readonly finance = inject(FinanceService);
  private readonly organization = inject(OrganizationService);
  protected readonly categories = inject(CategoriesStore);
  private readonly session = inject(Session);
  private readonly transloco = inject(TranslocoService);
  protected readonly language = injectActiveLanguage();

  protected readonly icons = {
    arrow: ArrowRight,
    income: ArrowDownLeft,
    expense: ArrowUpRight,
    link: Link2,
    location: MapPin,
    empty: ChartPie,
  };

  private readonly now = new Date();
  protected readonly today = localDay(this.now);
  protected readonly current = computed(() => toMonthKey(this.month(), this.now));
  protected readonly state = computed(() => monthState(this.current(), this.now));
  protected readonly range = signal<SpendRange>('month');
  protected readonly taskTab = signal<TaskTab>('all');

  protected readonly summary = resource({
    params: () => ({ month: this.current(), version: this.finance.version() }),
    loader: ({ params }) => this.finance.summary(params.month),
  });

  protected readonly daily = resource({
    params: () => ({ month: this.current(), version: this.finance.version() }),
    loader: async ({ params }) => {
      const [current, previous] = await Promise.all([
        this.finance.dailyExpenses(params.month),
        this.finance.dailyExpenses(addMonths(params.month, -1)),
      ]);
      return { current, previous };
    },
  });

  protected readonly budgets = resource({
    params: () => ({ month: this.current(), version: this.finance.version() }),
    loader: ({ params }) => this.finance.budgets(params.month),
  });

  protected readonly byCategory = resource({
    params: () => ({ month: this.current(), version: this.finance.version() }),
    loader: ({ params }) => this.finance.expensesByCategory(params.month),
  });

  protected readonly tasks = resource({
    params: () => ({ version: this.organization.version() }),
    loader: () => this.organization.tasks(),
  });

  protected readonly events = resource({
    params: () => ({ version: this.organization.version() }),
    loader: () => this.organization.events(this.now, parseDay(addDays(this.today, 45))),
  });

  constructor() {
    inject(PageHeading).use(
      computed(() => {
        const language = this.language();
        const user = this.session.user();
        const greeting = this.transloco.translate(
          `dashboard.greeting.${greetingFor(this.now.getHours(), language)}`,
        );
        const name = user ? firstName(user.displayName) : '';
        const date = new Intl.DateTimeFormat(localeFor(language), {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }).format(this.now);
        const dueToday = this.tasks.hasValue()
          ? this.tasks.value().filter((task) => isOpen(task) && task.dueDate === this.today).length
          : null;
        const tasksText =
          dueToday === null
            ? ''
            : ` · ${this.transloco.translate(
                dueToday === 0
                  ? 'dashboard.tasksToday.none'
                  : dueToday === 1
                    ? 'dashboard.tasksToday.one'
                    : 'dashboard.tasksToday.other',
                { count: dueToday },
              )}`;
        return {
          title: name ? `${greeting}, ${name}` : greeting,
          subtitle: `${date.charAt(0).toLocaleUpperCase()}${date.slice(1)}${tasksText}`,
        };
      }),
    );
  }

  protected readonly monthName = computed(() => formatMonthInline(this.current(), this.language()));

  protected readonly hero = computed(() => {
    if (!this.summary.hasValue()) {
      return null;
    }
    const summary = this.summary.value();
    return {
      balance: balanceOf(summary),
      income: summary.income,
      expense: summary.expense,
      rate: savingsRate(summary),
    };
  });

  protected readonly rangeOptions = computed<readonly SegmentedOption<SpendRange>[]>(() => {
    this.language();
    return [
      { value: 'month', label: this.transloco.translate('dashboard.spend.month') },
      { value: 'week', label: this.transloco.translate('dashboard.spend.week') },
    ];
  });

  protected readonly spendPoints = computed<readonly LollipopPoint[]>(() => {
    if (!this.daily.hasValue()) {
      return [];
    }
    const language = this.language();
    const weekday = new Intl.DateTimeFormat(localeFor(language), { weekday: 'short' });
    const full = new Intl.DateTimeFormat(localeFor(language), { day: 'numeric', month: 'long' });
    const series = spendSeries(
      this.daily.value().current,
      this.current(),
      this.now,
      this.range(),
      this.session.user()?.weekStartsOn ?? 1,
    );
    const last = series.length;
    return series.map((point, index) => {
      const date = parseDay(point.date);
      const day = date.getDate();
      return {
        label: this.range() === 'week' ? weekday.format(date).replace('.', '') : String(day),
        title: full.format(date),
        value: point.value,
        future: point.future,
        highlight: point.highlight,
        showLabel: this.range() === 'week' || day === 1 || day % 5 === 0 || index === last - 1,
      };
    });
  });

  protected readonly spendBadge = computed(() => {
    const point = this.spendPoints().find((item) => item.highlight);
    return point ? `${point.title} · ${this.money(point.value)}` : '';
  });

  protected readonly comparison = computed(() =>
    this.daily.hasValue()
      ? compareSpend(
          this.daily.value().current,
          this.daily.value().previous,
          this.current(),
          this.now,
        )
      : null,
  );

  protected readonly previousName = computed(() =>
    new Intl.DateTimeFormat(localeFor(this.language()), { month: 'long' }).format(
      parseDay(`${addMonths(this.current(), -1)}-01`),
    ),
  );

  protected readonly budgetRows = computed(() => {
    if (!this.budgets.hasValue()) {
      return [];
    }
    return this.budgets
      .value()
      .map(({ budget, spent }) => ({
        budget,
        spent,
        category: this.categories.find(budget.categoryId),
        usage: budgetUsage(spent, budget.amount),
        status: budgetStatus(spent, budget.amount),
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 4);
  });

  protected readonly breakdown = computed(() => {
    if (!this.byCategory.hasValue()) {
      return [];
    }
    const totals = this.byCategory.value();
    const all = totals.reduce((sum, total) => sum + total.total, 0);
    const rows = totals.slice(0, 4).map((total, index) => {
      const category = this.categories.find(total.categoryId);
      return {
        id: total.categoryId,
        name: category?.name ?? '',
        icon: category?.icon ?? 'circle',
        color: category?.color ?? 'sand',
        chartColor: CHART_COLORS[index] ?? 'var(--nx-chart-6)',
        total: total.total,
        share: shareOf(total.total, all),
      };
    });
    const rest = totals.slice(4).reduce((sum, total) => sum + total.total, 0);
    if (rest > 0) {
      rows.push({
        id: 'other',
        name: this.transloco.translate('finances.overview.otherCategories'),
        icon: 'ellipsis',
        color: 'sand',
        chartColor: 'var(--nx-chart-6)',
        total: rest,
        share: shareOf(rest, all),
      });
    }
    return rows;
  });

  protected readonly segments = computed(() =>
    this.breakdown().map((row) => ({ label: row.name, value: row.total, color: row.chartColor })),
  );

  protected readonly expenseTotal = computed(() =>
    this.breakdown().reduce((sum, row) => sum + row.total, 0),
  );

  protected readonly payments = computed(() => {
    if (!this.tasks.hasValue()) {
      return [];
    }
    const budgets = this.budgets.hasValue() ? this.budgets.value() : [];
    return upcomingPayments(this.tasks.value()).map((task) => {
      const row = budgets.find(
        (item) =>
          item.budget.categoryId === task.planned?.categoryId &&
          (task.dueDate ?? this.today).startsWith(item.budget.month),
      );
      return {
        task,
        category: this.categories.find(task.planned?.categoryId),
        overBudget: row ? row.spent + (task.planned?.amount ?? 0) > row.budget.amount : false,
      };
    });
  });

  protected readonly paymentsTotal = computed(() =>
    plannedTotal(this.payments().map((payment) => payment.task)),
  );

  protected readonly openTasks = computed(() =>
    this.tasks.hasValue() ? this.tasks.value().filter(isOpen).sort(compareTasks('due')) : [],
  );

  protected readonly taskCounts = computed(() => {
    const open = this.openTasks();
    return {
      all: open.length,
      today: open.filter((task) => task.dueDate !== null && task.dueDate <= this.today).length,
      high: open.filter((task) => task.priority === 'high').length,
    };
  });

  protected readonly visibleTasks = computed(() => {
    const tab = this.taskTab();
    return this.openTasks()
      .filter((task) =>
        tab === 'today'
          ? task.dueDate !== null && task.dueDate <= this.today
          : tab === 'high'
            ? task.priority === 'high'
            : true,
      )
      .slice(0, 5);
  });

  protected readonly nextEvents = computed(() =>
    this.events.hasValue() ? this.events.value().slice(0, 4) : [],
  );

  protected money(cents: number): string {
    return formatMoney(cents, this.language());
  }

  protected percent(value: number): string {
    return new Intl.NumberFormat(localeFor(this.language()), { maximumFractionDigits: 1 }).format(
      value,
    );
  }

  protected readonly formatMoney = (cents: number) => this.money(cents);
  protected readonly formatAxis = (cents: number) =>
    new Intl.NumberFormat(localeFor(this.language()), {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(cents / 100);

  protected dueText(task: Task): string {
    this.language();
    const kind = dueKind(task.dueDate, this.today, isOpen(task));
    if (kind === 'none') {
      return this.transloco.translate('organization.due.none');
    }
    const date = task.dueDate
      ? new Intl.DateTimeFormat(localeFor(this.language()), { day: 'numeric', month: 'short' })
          .format(parseDay(task.dueDate))
          .replace('.', '')
      : '';
    return this.transloco.translate(`organization.due.${kind}`, { date });
  }

  protected isLate(task: Task): boolean {
    const kind = dueKind(task.dueDate, this.today, isOpen(task));
    return kind === 'overdue' || kind === 'today';
  }

  protected eventDay(startsAt: string): { weekday: string; day: number } {
    const date = new Date(startsAt);
    return {
      weekday: new Intl.DateTimeFormat(localeFor(this.language()), { weekday: 'short' })
        .format(date)
        .replace('.', ''),
      day: date.getDate(),
    };
  }

  protected eventTime(startsAt: string, allDay: boolean): string {
    return allDay
      ? this.transloco.translate('organization.calendar.allDay')
      : new Intl.DateTimeFormat(localeFor(this.language()), {
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(startsAt));
  }

  protected heroBadge(): string {
    const state = this.state();
    return state === 'current'
      ? this.transloco.translate('dashboard.hero.current', {
          count: daysLeft(this.current(), this.now),
        })
      : this.transloco.translate(`dashboard.hero.${state}`);
  }
}
