import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { User } from 'lucide';
import { NxIcon } from '../icon/icon';

export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toLocaleUpperCase())
    .join('');
}

@Component({
  selector: 'nx-avatar',
  imports: [NxIcon],
  template: `
    @if (visibleSrc(); as src) {
      <img [src]="src" alt="" referrerpolicy="no-referrer" (error)="failed.set(true)" />
    } @else if (initials()) {
      <span aria-hidden="true">{{ initials() }}</span>
    } @else {
      <svg nx-icon [icon]="fallbackIcon" size="55%"></svg>
    }
  `,
  styles: `
    :host {
      --size: 36px;

      display: inline-grid;
      place-items: center;
      flex: none;
      width: var(--size);
      height: var(--size);
      overflow: hidden;
      border-radius: 50%;
      background: var(--nx-highlight-strong);
      color: var(--nx-text);
      font-family: var(--nx-font-heading);
      font-size: calc(var(--size) * 0.36);
      font-weight: 700;
    }
    :host(.sm) {
      --size: 28px;
    }
    :host(.lg) {
      --size: 56px;
    }
    :host(.xl) {
      --size: 80px;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
  host: {
    role: 'img',
    '[attr.aria-label]': 'name() || null',
    '[attr.aria-hidden]': 'name() ? null : "true"',
    '[class]': 'size()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxAvatar {
  readonly name = input('');
  readonly src = input<string | null>(null);
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');

  protected readonly failed = linkedSignal({ source: this.src, computation: () => false });
  protected readonly visibleSrc = computed(() => (this.failed() ? null : this.src()));
  protected readonly initials = computed(() => initialsOf(this.name()));
  protected readonly fallbackIcon = User;
}
