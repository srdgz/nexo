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
import { Info, Link2, Trash2 } from 'lucide';
import { CategoriesStore } from '@features/finances/application/categories.store';
import { FinanceService } from '@features/finances/application/finance.service';
import { NxAlert } from '@shared/ui/alert/alert';
import { NxButton } from '@shared/ui/button/button';
import { NxCard, NxCardHeader } from '@shared/ui/card/card';
import { NxSwitch } from '@shared/ui/choice/choice';
import { NxDialog } from '@shared/ui/dialog/dialog';
import { NxErrorState } from '@shared/ui/feedback-state/feedback-state';
import { NxField, NxInput } from '@shared/ui/field/field';
import { NxIcon } from '@shared/ui/icon/icon';
import { NxMoneyInput } from '@shared/ui/money-input/money-input';
import { NxSegmented, type SegmentedOption } from '@shared/ui/segmented/segmented';
import { NxSkeleton } from '@shared/ui/skeleton/skeleton';
import { ToastService } from '@shared/ui/toast/toast';
import { injectActiveLanguage } from '@shared/util/active-language';
import { formatMoney } from '@shared/util/money';
import { OrganizationService } from '../../../application/organization.service';
import { localDay } from '../../../domain/calendar';
import {
  type OrganizationErrorCode,
  toOrganizationError,
} from '../../../domain/organization-error';
import {
  TASK_DESCRIPTION_MAX,
  TASK_TITLE_MAX,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from '../../../domain/task';
import { paymentLink } from '../../components/task-check';
import { dayMonth } from '../../organization-format';

interface TaskModel {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
  hasPlan: boolean;
  amount: number | null;
  categoryId: string;
}

@Component({
  selector: 'nx-task-form-page',
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
    NxMoneyInput,
    NxSegmented,
    NxSkeleton,
    NxSwitch,
    RouterLink,
    TranslocoPipe,
  ],
  templateUrl: './task-form-page.html',
  styleUrl: './task-form-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFormPage {
  readonly id = input<string>();
  readonly date = input<string>();

  private readonly organization = inject(OrganizationService);
  private readonly finance = inject(FinanceService);
  protected readonly categories = inject(CategoriesStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly language = injectActiveLanguage();

  protected readonly icons = { info: Info, link: Link2, remove: Trash2 };

  protected readonly existing = resource({
    params: () => this.id() || undefined,
    loader: ({ params }) => this.organization.task(params),
  });

  protected readonly linked = resource({
    params: () => {
      const id = this.id();
      return id ? { id, version: this.finance.version() } : undefined;
    },
    loader: ({ params }) => this.finance.transactionsForTask(params.id),
  });

  protected readonly model = signal<TaskModel>({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    status: 'pending',
    hasPlan: false,
    amount: null,
    categoryId: '',
  });

  protected readonly draft = form(this.model, (path) => {
    required(path.title);
    maxLength(path.title, TASK_TITLE_MAX);
    maxLength(path.description, TASK_DESCRIPTION_MAX);
    validate(path.amount, ({ value, valueOf }) =>
      valueOf(path.hasPlan) && !(value() !== null && (value() ?? 0) > 0)
        ? { kind: 'amount' }
        : undefined,
    );
    validate(path.categoryId, ({ value, valueOf }) =>
      valueOf(path.hasPlan) && !value() ? { kind: 'required' } : undefined,
    );
  });

  protected readonly priorityOptions = computed<readonly SegmentedOption<TaskPriority>[]>(() => {
    this.language();
    return (['low', 'medium', 'high'] as const).map((value) => ({
      value,
      label: this.transloco.translate(`organization.priority.${value}`),
    }));
  });

  protected readonly statusOptions = computed<readonly SegmentedOption<TaskStatus>[]>(() => {
    this.language();
    return (['pending', 'in_progress', 'completed'] as const).map((value) => ({
      value,
      label: this.transloco.translate(`organization.status.${value}`),
    }));
  });

  protected readonly expenseCategories = computed(() => {
    const current = this.model().categoryId;
    return this.categories
      .all()
      .filter(
        (category) =>
          category.type === 'expense' && (!category.archived || category.id === current),
      );
  });

  protected readonly budget = resource({
    params: () => {
      const { hasPlan, categoryId, dueDate } = this.model();
      if (!hasPlan || !categoryId) {
        return undefined;
      }
      const month = (dueDate || localDay(new Date())).slice(0, 7) as `${number}-${string}`;
      return { categoryId, month, version: this.finance.version() };
    },
    loader: ({ params }) => this.finance.budgetFor(params.categoryId, params.month),
  });

  protected readonly planHint = computed(() => {
    const { amount, categoryId } = this.model();
    const category = this.categories.find(categoryId);
    const paid = this.linked.hasValue() && this.linked.value().length > 0;
    if (!category || paid || !this.budget.hasValue()) {
      return null;
    }
    const row = this.budget.value();
    if (!row) {
      return this.transloco.translate('organization.form.planNoBudget', {
        category: category.name,
      });
    }
    const after = row.spent + (amount ?? 0);
    return this.transloco.translate(
      after > row.budget.amount ? 'organization.form.planOver' : 'organization.form.planFits',
      { category: category.name, amount: this.money(row.budget.amount) },
    );
  });

  protected readonly error = signal<OrganizationErrorCode | null>(null);
  protected readonly removeOpen = signal(false);
  protected readonly removing = signal(false);

  constructor() {
    effect(() => {
      const date = this.date();
      if (!this.id() && date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        untracked(() => this.model.update((model) => ({ ...model, dueDate: date })));
      }
    });
    effect(() => {
      if (this.existing.hasValue()) {
        const task = this.existing.value();
        untracked(() => this.load(task));
      }
    });
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.language());
  }

  protected shortDate(isoDay: string): string {
    return dayMonth(isoDay, this.language());
  }

  protected linkedTotal(): string {
    const items = this.linked.hasValue() ? this.linked.value() : [];
    return this.money(items.reduce((sum, item) => sum + item.amount, 0));
  }

  protected registerLink() {
    return this.existing.hasValue()
      ? paymentLink(
          this.existing.value(),
          `/app/organization/tasks/${this.existing.value().id}/edit`,
        )
      : null;
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(null);
    await submit(this.draft, async () => {
      const value = this.model();
      try {
        await this.organization.saveTask(this.id() ?? null, {
          title: value.title,
          description: value.description,
          priority: value.priority,
          dueDate: value.dueDate || null,
          status: value.status,
          planned:
            value.hasPlan && value.amount
              ? { amount: value.amount, categoryId: value.categoryId }
              : null,
        });
        this.toast.success(
          this.transloco.translate(
            this.id() ? 'organization.form.updated' : 'organization.form.created',
          ),
        );
        await this.router.navigateByUrl('/app/organization/tasks');
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
      await this.organization.removeTask(id);
      this.removeOpen.set(false);
      this.toast.success(this.transloco.translate('organization.tasks.deleted'));
      await this.router.navigateByUrl('/app/organization/tasks');
    } catch (error) {
      this.removeOpen.set(false);
      this.error.set(toOrganizationError(error).code);
    } finally {
      this.removing.set(false);
    }
  }

  private load(task: Task): void {
    this.model.set({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      dueDate: task.dueDate ?? '',
      status: task.status,
      hasPlan: task.planned !== null,
      amount: task.planned?.amount ?? null,
      categoryId: task.planned?.categoryId ?? '',
    });
  }
}
