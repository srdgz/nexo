export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskFilter = 'open' | 'in_progress' | 'completed' | 'all';
export type TaskSort = 'due' | 'priority' | 'created';
export type TaskGroupKey = 'overdue' | 'today' | 'week' | 'later' | 'undated' | 'done';

export const TASK_TITLE_MAX = 120;
export const TASK_DESCRIPTION_MAX = 2000;
export const TASK_PRIORITIES: readonly TaskPriority[] = ['high', 'medium', 'low'];

export interface PlannedPayment {
  readonly amount: number;
  readonly categoryId: string;
}

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly dueDate: string | null;
  readonly completedAt: string | null;
  readonly createdAt: string;
  readonly planned: PlannedPayment | null;
}

export type TaskDraft = Omit<Task, 'id' | 'completedAt' | 'createdAt'>;

export interface TaskGroup {
  readonly key: TaskGroupKey;
  readonly tasks: readonly Task[];
}

const PRIORITY_RANK: Readonly<Record<TaskPriority, number>> = { high: 0, medium: 1, low: 2 };

export function isOpen(task: Pick<Task, 'status'>): boolean {
  return task.status !== 'completed';
}

export function isOverdue(task: Pick<Task, 'status' | 'dueDate'>, today: string): boolean {
  return isOpen(task) && task.dueDate !== null && task.dueDate < today;
}

export function matchesFilter(
  task: Task,
  filter: TaskFilter,
  priorities: readonly TaskPriority[],
): boolean {
  const byStatus =
    filter === 'all' ||
    (filter === 'open' && isOpen(task)) ||
    (filter === 'in_progress' && task.status === 'in_progress') ||
    (filter === 'completed' && task.status === 'completed');
  return byStatus && (priorities.length === 0 || priorities.includes(task.priority));
}

export function compareTasks(sort: TaskSort): (a: Task, b: Task) => number {
  const byDue = (a: Task, b: Task) => {
    if (a.dueDate === b.dueDate) {
      return 0;
    }
    if (a.dueDate === null) {
      return 1;
    }
    if (b.dueDate === null) {
      return -1;
    }
    return a.dueDate.localeCompare(b.dueDate);
  };
  const byPriority = (a: Task, b: Task) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  const byCreated = (a: Task, b: Task) => b.createdAt.localeCompare(a.createdAt);
  const chains: Record<TaskSort, ((a: Task, b: Task) => number)[]> = {
    due: [byDue, byPriority, byCreated],
    priority: [byPriority, byDue, byCreated],
    created: [byCreated],
  };
  return (a, b) => {
    for (const compare of chains[sort]) {
      const result = compare(a, b);
      if (result !== 0) {
        return result;
      }
    }
    return a.title.localeCompare(b.title);
  };
}

export function groupKey(task: Task, today: string, weekEnd: string): TaskGroupKey {
  if (!isOpen(task)) {
    return 'done';
  }
  if (task.dueDate === null) {
    return 'undated';
  }
  if (task.dueDate < today) {
    return 'overdue';
  }
  if (task.dueDate === today) {
    return 'today';
  }
  return task.dueDate <= weekEnd ? 'week' : 'later';
}

const GROUP_ORDER: readonly TaskGroupKey[] = [
  'overdue',
  'today',
  'week',
  'later',
  'undated',
  'done',
];

export function groupTasks(tasks: readonly Task[], today: string, weekEnd: string): TaskGroup[] {
  const groups = new Map<TaskGroupKey, Task[]>();
  for (const task of tasks) {
    const key = groupKey(task, today, weekEnd);
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }
  return GROUP_ORDER.filter((key) => groups.has(key)).map((key) => ({
    key,
    tasks: groups.get(key) ?? [],
  }));
}

export function hasValidPlan(planned: PlannedPayment | null): boolean {
  return (
    planned === null ||
    (Number.isInteger(planned.amount) && planned.amount > 0 && planned.categoryId !== '')
  );
}

export function nextStatus(task: Pick<Task, 'status'>): TaskStatus {
  return task.status === 'completed' ? 'pending' : 'completed';
}
