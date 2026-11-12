import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { NxBadge, type BadgeTone } from '@shared/ui/badge/badge';
import type { TaskPriority, TaskStatus } from '../../domain/task';

const PRIORITY_TONES: Readonly<Record<TaskPriority, BadgeTone>> = {
  high: 'danger',
  medium: 'warning',
  low: 'neutral',
};

@Component({
  selector: 'nx-priority-badge',
  imports: [NxBadge, TranslocoPipe],
  template: `
    <nx-badge appearance="dot" [tone]="tone()">
      {{ 'organization.priority.' + priority() | transloco }}
    </nx-badge>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxPriorityBadge {
  readonly priority = input.required<TaskPriority>();

  protected readonly tone = computed(() => PRIORITY_TONES[this.priority()]);
}

const STATUS_TONES: Readonly<Record<TaskStatus | 'overdue', BadgeTone>> = {
  pending: 'neutral',
  in_progress: 'info',
  completed: 'success',
  overdue: 'danger',
};

@Component({
  selector: 'nx-status-badge',
  imports: [NxBadge, TranslocoPipe],
  template: `
    <nx-badge [tone]="tone()">{{ 'organization.status.' + status() | transloco }}</nx-badge>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxStatusBadge {
  readonly status = input.required<TaskStatus | 'overdue'>();

  protected readonly tone = computed(() => STATUS_TONES[this.status()]);
}
