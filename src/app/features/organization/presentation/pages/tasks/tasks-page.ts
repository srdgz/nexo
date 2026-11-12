import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CircleDot, Ellipsis, ListChecks, Pencil, Plus, Trash2 } from 'lucide';
import { CategoriesStore } from '@features/finances/application/categories.store';
import { NxAlert } from '@shared/ui/alert/alert';
import { NxBadge } from '@shared/ui/badge/badge';
import { NxButton } from '@shared/ui/button/button';
import { NxCard } from '@shared/ui/card/card';
import { NxChip } from '@shared/ui/chip/chip';
import { NxDialog } from '@shared/ui/dialog/dialog';
import { NxEmptyState, NxErrorState } from '@shared/ui/feedback-state/feedback-state';
import { NxInput } from '@shared/ui/field/field';
import { NxIcon } from '@shared/ui/icon/icon';
import { NxIconButton } from '@shared/ui/icon-button/icon-button';
import { NxMenu, NxMenuItem, NxMenuSeparator, NxMenuTrigger } from '@shared/ui/menu/menu';
import { NxSkeleton } from '@shared/ui/skeleton/skeleton';
import { ToastService } from '@shared/ui/toast/toast';
import { injectActiveLanguage } from '@shared/util/active-language';
import { formatMoney } from '@shared/util/money';
import { OrganizationService } from '../../../application/organization.service';
import { addDays, localDay } from '../../../domain/calendar';
import {
  type OrganizationErrorCode,
  toOrganizationError,
} from '../../../domain/organization-error';
import {
  TASK_PRIORITIES,
  type Task,
  type TaskFilter,
  type TaskPriority,
  type TaskSort,
  compareTasks,
  groupTasks,
  isOpen,
  matchesFilter,
} from '../../../domain/task';
import { NxPriorityBadge } from '../../components/priority-badge';
import { NxTaskCheck, NxTaskPaymentPrompt } from '../../components/task-check';
import { dayMonth, dueKind } from '../../organization-format';

const FILTERS: readonly TaskFilter[] = ['open', 'in_progress', 'completed', 'all'];
const SORTS: readonly TaskSort[] = ['due', 'priority', 'created'];

@Component({
  selector: 'nx-tasks-page',
  imports: [
    NxAlert,
    NxBadge,
    NxButton,
    NxCard,
    NxChip,
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
    NxPriorityBadge,
    NxSkeleton,
    NxTaskCheck,
    NxTaskPaymentPrompt,
    RouterLink,
    TranslocoPipe,
  ],
  templateUrl: './tasks-page.html',
  styleUrl: './tasks-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksPage {
  readonly status = input<string>();
  readonly priority = input<string>();
  readonly sort = input<string>();

  private readonly organization = inject(OrganizationService);
  protected readonly categories = inject(CategoriesStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly language = injectActiveLanguage();

  protected readonly icons = {
    plus: Plus,
    more: Ellipsis,
    edit: Pencil,
    remove: Trash2,
    progress: CircleDot,
    empty: ListChecks,
  };
  protected readonly filters = FILTERS;
  protected readonly sorts = SORTS;
  protected readonly priorities = TASK_PRIORITIES;

  protected readonly today = localDay(new Date());

  protected readonly filter = computed<TaskFilter>(() => {
    const value = this.status() as TaskFilter;
    return FILTERS.includes(value) ? value : 'open';
  });
  protected readonly selectedPriorities = computed<TaskPriority[]>(() =>
    (this.priority() ?? '')
      .split(',')
      .filter((value): value is TaskPriority => TASK_PRIORITIES.includes(value as TaskPriority)),
  );
  protected readonly order = computed<TaskSort>(() => {
    const value = this.sort() as TaskSort;
    return SORTS.includes(value) ? value : 'due';
  });

  protected readonly tasks = resource({
    params: () => ({ version: this.organization.version() }),
    loader: () => this.organization.tasks(),
  });

  protected readonly counts = computed(() => {
    const all = this.tasks.hasValue() ? this.tasks.value() : [];
    return {
      open: all.filter(isOpen).length,
      in_progress: all.filter((task) => task.status === 'in_progress').length,
      completed: all.filter((task) => task.status === 'completed').length,
      all: all.length,
    } satisfies Record<TaskFilter, number>;
  });

  protected readonly groups = computed(() => {
    if (!this.tasks.hasValue()) {
      return [];
    }
    const visible = this.tasks
      .value()
      .filter((task) => matchesFilter(task, this.filter(), this.selectedPriorities()))
      .sort(compareTasks(this.order()));
    return groupTasks(visible, this.today, addDays(this.today, 7));
  });

  protected readonly removing = signal<Task | null>(null);
  protected readonly removeOpen = signal(false);
  protected readonly removeError = signal<OrganizationErrorCode | null>(null);
  protected readonly busy = signal(false);

  protected dueText(task: Task): string {
    this.language();
    const kind = dueKind(task.dueDate, this.today, isOpen(task));
    if (kind === 'none') {
      return this.transloco.translate('organization.due.none');
    }
    const date = task.dueDate ? dayMonth(task.dueDate, this.language()) : '';
    return this.transloco.translate(`organization.due.${kind}`, { date });
  }

  protected isOverdueText(task: Task): boolean {
    return dueKind(task.dueDate, this.today, isOpen(task)) === 'overdue';
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.language());
  }

  protected setFilter(filter: TaskFilter): void {
    this.navigate({ status: filter === 'open' ? null : filter });
  }

  protected togglePriority(priority: TaskPriority): void {
    const current = this.selectedPriorities();
    const next = current.includes(priority)
      ? current.filter((value) => value !== priority)
      : [...current, priority];
    this.navigate({ priority: next.length ? next.join(',') : null });
  }

  protected setSort(sort: string): void {
    this.navigate({ sort: sort === 'due' ? null : sort });
  }

  protected async setInProgress(task: Task, inProgress: boolean): Promise<void> {
    try {
      await this.organization.setTaskStatus(task.id, inProgress ? 'in_progress' : 'pending');
    } catch (error) {
      this.toast.error(
        this.transloco.translate(`organization.errors.${toOrganizationError(error).code}`),
      );
    }
  }

  protected askRemove(task: Task): void {
    this.removing.set(task);
    this.removeError.set(null);
    this.removeOpen.set(true);
  }

  protected async remove(): Promise<void> {
    const task = this.removing();
    if (!task) {
      return;
    }
    this.busy.set(true);
    try {
      await this.organization.removeTask(task.id);
      this.removeOpen.set(false);
      this.toast.success(this.transloco.translate('organization.tasks.deleted'));
    } catch (error) {
      this.removeError.set(toOrganizationError(error).code);
    } finally {
      this.busy.set(false);
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
