import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type OnInit,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ArrowLeftRight, Ellipsis, Pencil, Plus, Trash2 } from 'lucide';
import { injectMediaQuery } from '@core/layout/media-query';
import { NxAlert } from '@shared/ui/alert/alert';
import { NxButton } from '@shared/ui/button/button';
import { NxCard } from '@shared/ui/card/card';
import { NxDialog } from '@shared/ui/dialog/dialog';
import { NxEmptyState, NxErrorState } from '@shared/ui/feedback-state/feedback-state';
import { NxInput } from '@shared/ui/field/field';
import { NxIcon } from '@shared/ui/icon/icon';
import { NxIconButton } from '@shared/ui/icon-button/icon-button';
import { NxMenu, NxMenuItem, NxMenuSeparator, NxMenuTrigger } from '@shared/ui/menu/menu';
import { NxPagination } from '@shared/ui/pagination/pagination';
import { NxSegmented, type SegmentedOption } from '@shared/ui/segmented/segmented';
import { NxSkeleton } from '@shared/ui/skeleton/skeleton';
import { ToastService } from '@shared/ui/toast/toast';
import { injectActiveLanguage } from '@shared/util/active-language';
import { CategoriesStore } from '../../../application/categories.store';
import { FinanceService } from '../../../application/finance.service';
import type { EntryType } from '../../../domain/category';
import { type FinanceErrorCode, toFinanceError } from '../../../domain/finance-error';
import { toMonthKey } from '../../../domain/month';
import { PAGE_SIZE, type Transaction, type TransactionQuery } from '../../../domain/transaction';
import { NxCategoryTile } from '../../components/category-tile';
import { dayKind, groupByDay, shortDate, signedMoney } from '../../finance-format';
import { financeMessageKey } from '../../finance-messages';

type TypeFilter = EntryType | 'all';

@Component({
  selector: 'nx-transactions-page',
  imports: [
    NxAlert,
    NxButton,
    NxCard,
    NxCategoryTile,
    NxDialog,
    NxEmptyState,
    NxErrorState,
    NxIcon,
    NxIconButton,
    NxInput,
    NxMenu,
    NxMenuItem,
    NxMenuSeparator,
    NxMenuTrigger,
    NxPagination,
    NxSegmented,
    NxSkeleton,
    RouterLink,
    TranslocoPipe,
  ],
  templateUrl: './transactions-page.html',
  styleUrl: './transactions-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsPage implements OnInit {
  readonly month = input<string>();
  readonly type = input<string>();
  readonly category = input<string>();
  readonly q = input<string>();
  readonly page = input<string>();

  protected readonly categories = inject(CategoriesStore);
  private readonly finance = inject(FinanceService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  protected readonly language = injectActiveLanguage();
  protected readonly compact = injectMediaQuery('(max-width: 767.98px)');

  protected readonly icons = {
    plus: Plus,
    more: Ellipsis,
    edit: Pencil,
    remove: Trash2,
    empty: ArrowLeftRight,
  };
  protected readonly pageSize = PAGE_SIZE;
  protected readonly messageKey = financeMessageKey;

  protected readonly query = computed<TransactionQuery>(() => {
    const type = this.type();
    const page = Number(this.page());
    return {
      month: toMonthKey(this.month(), new Date()),
      type: type === 'income' || type === 'expense' ? type : null,
      categoryId: this.category() || null,
      search: this.q() ?? '',
      page: Number.isInteger(page) && page > 0 ? page : 1,
    };
  });

  protected readonly typeFilter = computed<TypeFilter>(() => this.query().type ?? 'all');
  protected readonly typeOptions = computed<readonly SegmentedOption<TypeFilter>[]>(() => {
    this.language();
    return [
      { value: 'all', label: this.transloco.translate('finances.transactions.all') },
      { value: 'income', label: this.transloco.translate('finances.types.income') },
      { value: 'expense', label: this.transloco.translate('finances.types.expense') },
    ];
  });

  protected readonly categoryOptions = computed(() => {
    const type = this.query().type;
    return this.categories.all().filter((category) => !type || category.type === type);
  });

  protected readonly transactions = resource({
    params: () => ({ query: this.query(), version: this.finance.version() }),
    loader: ({ params }) => this.finance.transactions(params.query),
  });

  protected readonly groups = computed(() =>
    this.transactions.hasValue() ? groupByDay(this.transactions.value().items) : [],
  );

  protected readonly hasFilters = computed(() => {
    const query = this.query();
    return Boolean(query.type || query.categoryId || query.search);
  });

  protected readonly removing = signal<Transaction | null>(null);
  protected readonly removeOpen = signal(false);
  protected readonly removeError = signal<FinanceErrorCode | null>(null);
  protected readonly busy = signal(false);
  protected readonly searchText = signal('');

  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
  }

  ngOnInit(): void {
    this.searchText.set(this.q() ?? '');
  }

  protected categoryName(id: string): string {
    return this.categories.find(id)?.name ?? '';
  }

  protected amount(transaction: Transaction): string {
    return signedMoney(transaction, this.language());
  }

  protected date(isoDay: string): string {
    return shortDate(isoDay, this.language());
  }

  protected dayLabel(isoDay: string): string {
    const kind = dayKind(isoDay, new Date());
    return kind === 'other'
      ? this.date(isoDay)
      : this.transloco.translate(`finances.transactions.${kind}`);
  }

  protected setType(type: TypeFilter): void {
    const category = this.categories.find(this.query().categoryId);
    const keepsCategory = !category || type === 'all' || category.type === type;
    this.navigate({
      type: type === 'all' ? null : type,
      ...(keepsCategory ? {} : { category: null }),
    });
  }

  protected setCategory(id: string): void {
    this.navigate({ category: id || null });
  }

  protected onSearch(value: string): void {
    this.searchText.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.navigate({ q: value.trim() || null }), 300);
  }

  protected setPage(page: number): void {
    this.navigate({ page: page > 1 ? page : null }, false);
  }

  protected clearFilters(): void {
    this.searchText.set('');
    this.navigate({ type: null, category: null, q: null });
  }

  protected askRemove(transaction: Transaction): void {
    this.removing.set(transaction);
    this.removeError.set(null);
    this.removeOpen.set(true);
  }

  protected async remove(): Promise<void> {
    const transaction = this.removing();
    if (!transaction) {
      return;
    }
    this.busy.set(true);
    this.removeError.set(null);
    try {
      await this.finance.removeTransaction(transaction.id);
      this.removeOpen.set(false);
      this.toast.success(this.transloco.translate('finances.transactions.deleted'));
    } catch (error) {
      this.removeError.set(toFinanceError(error).code);
    } finally {
      this.busy.set(false);
    }
  }

  private navigate(params: Record<string, string | number | null>, resetPage = true): void {
    const queryParams = resetPage ? { page: null, ...params } : params;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }
}
