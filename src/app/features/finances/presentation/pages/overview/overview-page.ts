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
import { ArrowRight, ChartPie } from 'lucide';
import { NxBarChart, type BarGroup, type ChartSeries } from '@shared/charts/bar-chart';
import { NxDonutChart, type DonutSegment } from '@shared/charts/donut-chart';
import { NxCard, NxCardHeader } from '@shared/ui/card/card';
import { NxEmptyState, NxErrorState } from '@shared/ui/feedback-state/feedback-state';
import { NxIcon } from '@shared/ui/icon/icon';
import { NxSegmented, type SegmentedOption } from '@shared/ui/segmented/segmented';
import { NxSkeleton } from '@shared/ui/skeleton/skeleton';
import { NxStatCard, type StatTrend } from '@shared/ui/stat-card/stat-card';
import { injectActiveLanguage, localeFor } from '@shared/util/active-language';
import { formatMoney } from '@shared/util/money';
import { CategoriesStore } from '../../../application/categories.store';
import { FinanceService } from '../../../application/finance.service';
import { balanceOf, changeRatio, savingsRate, shareOf } from '../../../domain/insights';
import { type MonthKey, addMonths, monthDate, toMonthKey } from '../../../domain/month';
import type { Transaction } from '../../../domain/transaction';
import { NxCategoryTile } from '../../components/category-tile';
import { shortDate, signedMoney } from '../../finance-format';

const CHART_COLORS = [
  'var(--nx-chart-1)',
  'var(--nx-chart-2)',
  'var(--nx-chart-3)',
  'var(--nx-chart-4)',
  'var(--nx-chart-5)',
  'var(--nx-chart-6)',
];
const TOP_CATEGORIES = 5;

@Component({
  selector: 'nx-overview-page',
  imports: [
    NxBarChart,
    NxCard,
    NxCardHeader,
    NxCategoryTile,
    NxDonutChart,
    NxEmptyState,
    NxErrorState,
    NxIcon,
    NxSegmented,
    NxSkeleton,
    NxStatCard,
    RouterLink,
    TranslocoPipe,
  ],
  templateUrl: './overview-page.html',
  styleUrl: './overview-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewPage {
  readonly month = input<string>();

  protected readonly categories = inject(CategoriesStore);
  private readonly finance = inject(FinanceService);
  private readonly transloco = inject(TranslocoService);
  protected readonly language = injectActiveLanguage();

  protected readonly icons = { arrow: ArrowRight, empty: ChartPie };
  protected readonly current = computed(() => toMonthKey(this.month(), new Date()));
  protected readonly range = signal<6 | 12>(6);

  protected readonly summary = resource({
    params: () => ({ month: this.current(), version: this.finance.version() }),
    loader: async ({ params }) => {
      const [current, previous] = await Promise.all([
        this.finance.summary(params.month),
        this.finance.summary(addMonths(params.month, -1)),
      ]);
      return { current, previous };
    },
  });

  protected readonly trend = resource({
    params: () => ({
      month: this.current(),
      months: this.range(),
      version: this.finance.version(),
    }),
    loader: ({ params }) => this.finance.trend(params.month, params.months),
  });

  protected readonly byCategory = resource({
    params: () => ({ month: this.current(), version: this.finance.version() }),
    loader: ({ params }) => this.finance.expensesByCategory(params.month),
  });

  protected readonly largest = resource({
    params: () => ({ month: this.current(), version: this.finance.version() }),
    loader: ({ params }) => this.finance.largestExpenses(params.month, 5),
  });

  protected readonly rangeOptions = computed<readonly SegmentedOption<6 | 12>[]>(() => {
    this.language();
    return [
      { value: 6, label: this.transloco.translate('finances.overview.months', { count: 6 }) },
      { value: 12, label: this.transloco.translate('finances.overview.months', { count: 12 }) },
    ];
  });

  protected readonly stats = computed(() => {
    if (!this.summary.hasValue()) {
      return null;
    }
    this.language();
    const { current, previous } = this.summary.value();
    const rate = savingsRate(current);
    const previousRate = savingsRate(previous);
    return [
      {
        label: this.transloco.translate('finances.overview.income'),
        value: this.money(current.income),
        trend: this.trendOf(current.income, previous.income, true),
      },
      {
        label: this.transloco.translate('finances.overview.expense'),
        value: this.money(current.expense),
        trend: this.trendOf(current.expense, previous.expense, false),
      },
      {
        label: this.transloco.translate('finances.overview.balance'),
        value: this.money(balanceOf(current)),
        trend: this.trendOf(balanceOf(current), balanceOf(previous), true),
        highlight: true,
      },
      {
        label: this.transloco.translate('finances.overview.savings'),
        value:
          rate === null
            ? this.transloco.translate('finances.overview.notAvailable')
            : `${this.percent(rate)} %`,
        trend:
          rate === null || previousRate === null ? null : this.pointsTrend(rate - previousRate),
      },
    ];
  });

  protected readonly series = computed<readonly ChartSeries[]>(() => {
    this.language();
    return [
      { label: this.transloco.translate('finances.overview.income'), color: 'var(--nx-chart-1)' },
      { label: this.transloco.translate('finances.overview.expense'), color: 'var(--nx-chart-2)' },
    ];
  });

  protected readonly trendGroups = computed<readonly BarGroup[]>(() => {
    if (!this.trend.hasValue()) {
      return [];
    }
    const formatter = new Intl.DateTimeFormat(localeFor(this.language()), { month: 'short' });
    return this.trend.value().map((row) => ({
      label: formatter.format(monthDate(row.month)).replace('.', ''),
      values: [row.income, row.expense],
    }));
  });

  protected readonly breakdown = computed(() => {
    if (!this.byCategory.hasValue()) {
      return [];
    }
    const totals = this.byCategory.value();
    const all = totals.reduce((sum, total) => sum + total.total, 0);
    const top = totals.slice(0, TOP_CATEGORIES).map((total, index) => {
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
    const rest = totals.slice(TOP_CATEGORIES).reduce((sum, total) => sum + total.total, 0);
    if (rest > 0) {
      this.language();
      top.push({
        id: 'other',
        name: this.transloco.translate('finances.overview.otherCategories'),
        icon: 'ellipsis',
        color: 'sand',
        chartColor: 'var(--nx-chart-6)',
        total: rest,
        share: shareOf(rest, all),
      });
    }
    return top;
  });

  protected readonly segments = computed<readonly DonutSegment[]>(() =>
    this.breakdown().map((row) => ({ label: row.name, value: row.total, color: row.chartColor })),
  );

  protected readonly expenseTotal = computed(() =>
    this.breakdown().reduce((sum, row) => sum + row.total, 0),
  );

  protected readonly formatMoney = (cents: number) => this.money(cents);
  protected readonly formatAxis = (cents: number) =>
    new Intl.NumberFormat(localeFor(this.language()), {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(cents / 100);

  protected money(cents: number): string {
    return formatMoney(cents, this.language());
  }

  protected percent(value: number): string {
    return new Intl.NumberFormat(localeFor(this.language()), { maximumFractionDigits: 1 }).format(
      value,
    );
  }

  protected amount(transaction: Transaction): string {
    return signedMoney(transaction, this.language());
  }

  protected date(isoDay: string): string {
    return shortDate(isoDay, this.language());
  }

  protected transactionsLink(month: MonthKey): { month: MonthKey; type: string } {
    return { month, type: 'expense' };
  }

  private trendOf(current: number, previous: number, higherIsBetter: boolean): StatTrend | null {
    const change = changeRatio(current, previous);
    if (change === null) {
      return null;
    }
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
    const good = higherIsBetter ? change > 0 : change < 0;
    return {
      direction,
      tone: change === 0 ? 'neutral' : good ? 'positive' : 'negative',
      text: this.transloco.translate('finances.overview.vsPrevious', {
        change: `${change > 0 ? '+' : change < 0 ? '−' : ''}${this.percent(Math.abs(change))} %`,
      }),
    };
  }

  private pointsTrend(points: number): StatTrend {
    const rounded = Math.round(points * 10) / 10;
    return {
      direction: rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat',
      tone: rounded > 0 ? 'positive' : rounded < 0 ? 'negative' : 'neutral',
      text: this.transloco.translate('finances.overview.pointsVsPrevious', {
        points: `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${this.percent(Math.abs(rounded))}`,
      }),
    };
  }
}
