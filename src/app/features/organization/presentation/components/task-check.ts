import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Check } from 'lucide';
import { CategoriesStore } from '@features/finances/application/categories.store';
import { FinanceService } from '@features/finances/application/finance.service';
import { NxButton } from '@shared/ui/button/button';
import { NxDialog } from '@shared/ui/dialog/dialog';
import { NxIcon } from '@shared/ui/icon/icon';
import { ToastService } from '@shared/ui/toast/toast';
import { injectActiveLanguage } from '@shared/util/active-language';
import { formatMoney } from '@shared/util/money';
import { OrganizationService } from '../../application/organization.service';
import { toOrganizationError } from '../../domain/organization-error';
import { type Task, nextStatus } from '../../domain/task';

export function paymentLink(task: Task, returnUrl: string) {
  return {
    path: '/app/finances/transactions/new',
    queryParams: {
      type: 'expense',
      task: task.id,
      amount: task.planned?.amount ?? null,
      category: task.planned?.categoryId ?? null,
      description: task.title,
      returnUrl,
    },
  };
}

@Injectable({ providedIn: 'root' })
export class TaskCompletion {
  private readonly organization = inject(OrganizationService);
  private readonly finance = inject(FinanceService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  private readonly busyIds = signal<ReadonlySet<string>>(new Set());
  readonly pending = signal<{ task: Task; returnUrl: string } | null>(null);

  isBusy(id: string): boolean {
    return this.busyIds().has(id);
  }

  async toggle(task: Task, returnUrl: string): Promise<void> {
    const status = nextStatus(task);
    this.busyIds.update((ids) => new Set(ids).add(task.id));
    try {
      await this.organization.setTaskStatus(task.id, status);
      if (status === 'completed' && task.planned && !(await this.hasPayment(task.id))) {
        this.pending.set({ task, returnUrl });
      } else {
        this.toast.success(
          this.transloco.translate(
            status === 'completed' ? 'organization.tasks.completed' : 'organization.tasks.reopened',
          ),
        );
      }
    } catch (error) {
      this.toast.error(
        this.transloco.translate(`organization.errors.${toOrganizationError(error).code}`),
      );
    } finally {
      this.busyIds.update((ids) => {
        const next = new Set(ids);
        next.delete(task.id);
        return next;
      });
    }
  }

  async register(): Promise<void> {
    const pending = this.pending();
    this.pending.set(null);
    if (pending) {
      const link = paymentLink(pending.task, pending.returnUrl);
      await this.router.navigate([link.path], { queryParams: link.queryParams });
    }
  }

  dismiss(): void {
    if (this.pending()) {
      this.pending.set(null);
      this.toast.success(this.transloco.translate('organization.tasks.completed'));
    }
  }

  private async hasPayment(taskId: string): Promise<boolean> {
    try {
      return (await this.finance.transactionsForTask(taskId)).length > 0;
    } catch {
      return false;
    }
  }
}

@Component({
  selector: 'nx-task-check',
  imports: [NxIcon, TranslocoPipe],
  template: `
    <button
      type="button"
      role="checkbox"
      class="check"
      [class.done]="done()"
      [class.busy]="busy()"
      [attr.aria-checked]="done()"
      [attr.aria-busy]="busy() ? 'true' : null"
      [attr.aria-label]="
        (done() ? 'organization.tasks.reopen' : 'organization.tasks.complete')
          | transloco: { title: task().title }
      "
      [disabled]="busy()"
      (click)="completion.toggle(task(), returnUrl())"
    >
      @if (done()) {
        <svg nx-icon [icon]="checkIcon" size="14" strokeWidth="3"></svg>
      }
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
    .check {
      display: grid;
      place-items: center;
      width: 24px;
      height: 24px;
      border: 1.8px solid var(--nx-control-border);
      border-radius: 50%;
      color: var(--nx-on-accent-strong);
      transition:
        background-color var(--nx-duration) var(--nx-ease),
        border-color var(--nx-duration) var(--nx-ease);
    }
    .check:hover:not(:disabled) {
      border-color: var(--nx-accent-strong);
    }
    .check.done {
      border-color: var(--nx-accent-strong);
      background: var(--nx-accent-strong);
    }
    .check.busy {
      border-top-color: transparent;
      animation: spin 700ms linear infinite;
      cursor: progress;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxTaskCheck {
  readonly task = input.required<Task>();
  readonly returnUrl = input('/app/organization/tasks');

  protected readonly completion = inject(TaskCompletion);
  protected readonly checkIcon = Check;
  protected readonly done = computed(() => this.task().status === 'completed');
  protected readonly busy = computed(() => this.completion.isBusy(this.task().id));
}

@Component({
  selector: 'nx-task-payment-prompt',
  imports: [NxButton, NxDialog, TranslocoPipe],
  template: `
    <nx-dialog
      size="sm"
      [heading]="'organization.payment.title' | transloco: { amount: amount() }"
      [description]="
        'organization.payment.text' | transloco: { category: category(), title: title() }
      "
      [open]="open()"
      (openChange)="$event || completion.dismiss()"
    >
      <button
        nx-button
        variant="secondary"
        dialog-actions
        type="button"
        (click)="completion.dismiss()"
      >
        {{ 'organization.payment.later' | transloco }}
      </button>
      <button nx-button dialog-actions type="button" (click)="completion.register()">
        {{ 'organization.payment.register' | transloco }}
      </button>
    </nx-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxTaskPaymentPrompt {
  protected readonly completion = inject(TaskCompletion);
  private readonly categories = inject(CategoriesStore);
  private readonly language = injectActiveLanguage();

  protected readonly open = computed(() => this.completion.pending() !== null);
  protected readonly title = computed(() => this.completion.pending()?.task.title ?? '');
  protected readonly amount = computed(() => {
    const planned = this.completion.pending()?.task.planned;
    return planned ? formatMoney(planned.amount, this.language()) : '';
  });
  protected readonly category = computed(
    () => this.categories.find(this.completion.pending()?.task.planned?.categoryId)?.name ?? '',
  );
}
