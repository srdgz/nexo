import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Archive, ArchiveRestore, Ellipsis, Pencil, Plus, Tag, Trash2 } from 'lucide';
import { NxAlert } from '@shared/ui/alert/alert';
import { NxButton } from '@shared/ui/button/button';
import { NxCard } from '@shared/ui/card/card';
import { NxDialog } from '@shared/ui/dialog/dialog';
import { NxEmptyState, NxErrorState } from '@shared/ui/feedback-state/feedback-state';
import { NxIcon } from '@shared/ui/icon/icon';
import { NxIconButton } from '@shared/ui/icon-button/icon-button';
import { NxMenu, NxMenuItem, NxMenuSeparator, NxMenuTrigger } from '@shared/ui/menu/menu';
import { NxSegmented, type SegmentedOption } from '@shared/ui/segmented/segmented';
import { NxSkeleton } from '@shared/ui/skeleton/skeleton';
import { ToastService } from '@shared/ui/toast/toast';
import { injectActiveLanguage } from '@shared/util/active-language';
import { CategoriesStore } from '../../../application/categories.store';
import { FinanceService } from '../../../application/finance.service';
import type { Category, EntryType } from '../../../domain/category';
import { type FinanceErrorCode, toFinanceError } from '../../../domain/finance-error';
import { monthOf } from '../../../domain/month';
import { NxCategoryDialog } from '../../components/category-dialog';
import { NxCategoryTile } from '../../components/category-tile';
import { financeMessageKey } from '../../finance-messages';

@Component({
  selector: 'nx-categories-page',
  imports: [
    NxAlert,
    NxButton,
    NxCard,
    NxCategoryDialog,
    NxCategoryTile,
    NxDialog,
    NxEmptyState,
    NxErrorState,
    NxIcon,
    NxIconButton,
    NxMenu,
    NxMenuItem,
    NxMenuSeparator,
    NxMenuTrigger,
    NxSegmented,
    NxSkeleton,
    TranslocoPipe,
  ],
  templateUrl: './categories-page.html',
  styleUrl: './categories-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesPage {
  protected readonly store = inject(CategoriesStore);
  private readonly finance = inject(FinanceService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly language = injectActiveLanguage();

  protected readonly icons = {
    plus: Plus,
    more: Ellipsis,
    edit: Pencil,
    archive: Archive,
    restore: ArchiveRestore,
    remove: Trash2,
    empty: Tag,
  };

  protected readonly type = signal<EntryType>('expense');
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Category | null>(null);
  protected readonly removing = signal<Category | null>(null);
  protected readonly removeOpen = signal(false);
  protected readonly removeError = signal<FinanceErrorCode | null>(null);
  protected readonly busy = signal(false);
  protected readonly messageKey = financeMessageKey;

  private readonly usage = resource({
    params: () => ({ month: monthOf(new Date()), version: this.finance.version() }),
    loader: ({ params }) => this.finance.countByCategory(params.month),
  });

  protected readonly visible = computed(() =>
    this.store.all().filter((category) => category.type === this.type() && !category.archived),
  );
  protected readonly archived = computed(() =>
    this.store.all().filter((category) => category.archived),
  );
  protected readonly columns = computed(() => {
    const items = this.visible();
    const half = Math.ceil(items.length / 2);
    return [items.slice(0, half), items.slice(half)].filter((column) => column.length > 0);
  });

  protected readonly typeOptions = computed<readonly SegmentedOption<EntryType>[]>(() => {
    this.language();
    const count = (type: EntryType) =>
      this.store.all().filter((category) => category.type === type && !category.archived).length;
    return [
      {
        value: 'expense',
        label: `${this.transloco.translate('finances.types.expense')} · ${count('expense')}`,
      },
      {
        value: 'income',
        label: `${this.transloco.translate('finances.types.income')} · ${count('income')}`,
      },
    ];
  });

  protected usageText(category: Category): string {
    this.language();
    const count = this.usage.hasValue() ? (this.usage.value()[category.id] ?? 0) : 0;
    if (count === 0) {
      return this.transloco.translate('finances.categories.noUsage');
    }
    return this.transloco.translate(
      count === 1 ? 'finances.categories.usageOne' : 'finances.categories.usageOther',
      { count },
    );
  }

  protected create(): void {
    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  protected edit(category: Category): void {
    this.editing.set(category);
    this.dialogOpen.set(true);
  }

  protected askRemove(category: Category): void {
    this.removing.set(category);
    this.removeError.set(null);
    this.removeOpen.set(true);
  }

  protected async remove(): Promise<void> {
    const category = this.removing();
    if (!category) {
      return;
    }
    await this.run(async () => {
      await this.finance.removeCategory(category.id);
      this.removeOpen.set(false);
      this.toast.success(this.transloco.translate('finances.categories.deleted'));
    });
  }

  protected async setArchived(category: Category, archived: boolean): Promise<void> {
    await this.run(async () => {
      await this.finance.setCategoryArchived(category.id, archived);
      this.removeOpen.set(false);
      this.toast.success(
        this.transloco.translate(
          archived ? 'finances.categories.archivedToast' : 'finances.categories.restored',
        ),
      );
    });
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.removeError.set(null);
    try {
      await action();
    } catch (error) {
      const code = toFinanceError(error).code;
      if (this.removeOpen()) {
        this.removeError.set(code);
      } else {
        this.toast.error(this.transloco.translate(financeMessageKey(code)));
      }
    } finally {
      this.busy.set(false);
    }
  }
}
