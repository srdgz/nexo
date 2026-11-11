import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injectable,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CircleAlert, CircleCheck, Info, X } from 'lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { NxIconButton } from '../icon-button/icon-button';
import { NxIcon } from '../icon/icon';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  readonly id: number;
  readonly tone: ToastTone;
  readonly message: string;
}

const DEFAULT_DURATION = 5000;
const ERROR_DURATION = 8000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly items = signal<readonly Toast[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 0;

  readonly toasts = this.items.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.timers.forEach((timer) => clearTimeout(timer)));
  }

  show(message: string, tone: ToastTone = 'success', duration = DEFAULT_DURATION): number {
    this.nextId += 1;
    const id = this.nextId;
    this.items.update((items) => [...items, { id, tone, message }]);
    if (duration > 0) {
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), duration),
      );
    }
    return id;
  }

  success(message: string): number {
    return this.show(message, 'success');
  }

  error(message: string): number {
    return this.show(message, 'error', ERROR_DURATION);
  }

  info(message: string): number {
    return this.show(message, 'info');
  }

  dismiss(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.items.update((items) => items.filter((item) => item.id !== id));
  }
}

@Component({
  selector: 'nx-toast',
  imports: [NxIcon, NxIconButton, TranslocoPipe],
  template: `
    <span class="icon" aria-hidden="true">
      <svg nx-icon [icon]="icon()" size="16"></svg>
    </span>
    <p class="message">{{ toast().message }}</p>
    <button
      type="button"
      nx-icon-button
      size="sm"
      class="dismiss"
      [label]="'ui.close' | transloco"
      (click)="dismiss.emit()"
    >
      <svg nx-icon [icon]="closeIcon" size="16"></svg>
    </button>
  `,
  styleUrl: './toast.scss',
  host: { '[class]': 'toast().tone' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxToast {
  readonly toast = input.required<Toast>();
  readonly dismiss = output();

  protected readonly closeIcon = X;
  protected readonly icon = computed(() => {
    switch (this.toast().tone) {
      case 'error':
        return CircleAlert;
      case 'info':
        return Info;
      default:
        return CircleCheck;
    }
  });
}

@Component({
  selector: 'nx-toast-outlet',
  imports: [NxToast],
  template: `
    <div class="stack" role="status" aria-live="polite">
      @for (toast of polite(); track toast.id) {
        <nx-toast [toast]="toast" (dismiss)="service.dismiss(toast.id)" />
      }
    </div>
    <div class="stack" role="alert" aria-live="assertive">
      @for (toast of assertive(); track toast.id) {
        <nx-toast [toast]="toast" (dismiss)="service.dismiss(toast.id)" />
      }
    </div>
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      position: fixed;
      z-index: 50;
      right: var(--nx-space-4);
      bottom: calc(var(--nx-toast-offset, 0px) + var(--nx-space-4));
      left: var(--nx-space-4);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--nx-space-2);
      pointer-events: none;

      @include bp(tablet) {
        left: auto;
        align-items: flex-end;
      }
    }
    .stack {
      display: contents;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxToastOutlet {
  protected readonly service = inject(ToastService);
  protected readonly polite = computed(() =>
    this.service.toasts().filter((toast) => toast.tone !== 'error'),
  );
  protected readonly assertive = computed(() =>
    this.service.toasts().filter((toast) => toast.tone === 'error'),
  );
}
