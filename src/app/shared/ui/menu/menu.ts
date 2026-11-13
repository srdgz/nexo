import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  booleanAttribute,
  inject,
  input,
  signal,
} from '@angular/core';
import { uniqueId } from '../../util/unique-id';

export type MenuPlacement = 'bottom-start' | 'bottom-end';

const GAP = 6;
const EDGE = 8;
const ITEM_SELECTOR = '[role^="menuitem"]:not([disabled]):not([aria-disabled="true"])';

@Component({
  selector: 'nx-menu',
  template: '<ng-content />',
  styles: `
    :host {
      position: fixed;
      inset: auto;
      min-width: 220px;
      max-width: calc(100vw - 16px);
      margin: 0;
      padding: 6px;
      border: 1px solid var(--nx-border);
      border-radius: 18px;
      background: var(--nx-surface);
      color: var(--nx-text);
      box-shadow: var(--nx-shadow-md);
      opacity: 0;
      transform: translateY(-4px);
      transition:
        opacity 140ms var(--nx-ease),
        transform 140ms var(--nx-ease),
        overlay 140ms allow-discrete,
        display 140ms allow-discrete;
    }
    :host(:popover-open) {
      opacity: 1;
      transform: none;
    }
    @starting-style {
      :host(:popover-open) {
        opacity: 0;
        transform: translateY(-4px);
      }
    }
  `,
  host: {
    popover: 'auto',
    role: 'menu',
    '[id]': 'id',
    '[attr.aria-label]': 'label() || null',
    '(toggle)': 'onToggle($event)',
    '(keydown)': 'onKeydown($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxMenu {
  readonly label = input('');
  readonly placement = input<MenuPlacement>('bottom-end');

  readonly id = uniqueId('nx-menu');
  readonly isOpen = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private anchor: HTMLElement | null = null;

  register(anchor: HTMLElement): void {
    this.anchor = anchor;
  }

  close(): void {
    if (this.isOpen()) {
      this.host.hidePopover();
    }
  }

  protected onToggle(event: Event): void {
    const open = (event as ToggleEvent).newState === 'open';
    this.isOpen.set(open);
    if (open) {
      this.position();
      this.items()[0]?.focus();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const items = this.items();
    if (items.length === 0) {
      return;
    }
    const current = items.indexOf(document.activeElement as HTMLElement);
    const focusAt = (index: number) => items[(index + items.length) % items.length]?.focus();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusAt(current + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusAt(current - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAt(0);
        break;
      case 'End':
        event.preventDefault();
        focusAt(items.length - 1);
        break;
      case 'Tab':
        this.close();
        break;
    }
  }

  private items(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
  }

  private position(): void {
    if (!this.anchor) {
      return;
    }
    const anchor = this.anchor.getBoundingClientRect();
    const menu = this.host.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;

    let left = this.placement() === 'bottom-end' ? anchor.right - menu.width : anchor.left;
    left = Math.min(Math.max(EDGE, left), viewportWidth - menu.width - EDGE);

    let top = anchor.bottom + GAP;
    if (top + menu.height > viewportHeight - EDGE && anchor.top - GAP - menu.height > EDGE) {
      top = anchor.top - GAP - menu.height;
    }

    this.host.style.left = `${left}px`;
    this.host.style.top = `${top}px`;
  }
}

@Directive({
  selector: 'button[nxMenuTrigger]',
  host: {
    type: 'button',
    'aria-haspopup': 'menu',
    '[attr.popovertarget]': 'menu().id',
    '[attr.aria-controls]': 'menu().id',
    '[attr.aria-expanded]': 'menu().isOpen()',
    '(pointerdown)': 'register()',
    '(keydown)': 'register()',
    '(focus)': 'register()',
  },
})
export class NxMenuTrigger {
  readonly menu = input.required<NxMenu>({ alias: 'nxMenuTrigger' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected register(): void {
    this.menu().register(this.host);
  }
}

@Component({
  selector: 'button[nx-menu-item], a[nx-menu-item]',
  template: `
    <ng-content />
    @if (checked() !== null) {
      <span class="check" aria-hidden="true">{{ checked() ? '✓' : '' }}</span>
    }
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      min-height: 40px;
      padding: 0 12px;
      border-radius: 12px;
      color: var(--nx-text);
      font-weight: 500;
      text-align: left;
      text-decoration: none;
      white-space: nowrap;
      cursor: pointer;
    }
    :host(:hover),
    :host(:focus-visible) {
      background: var(--nx-surface-muted);
      outline: none;
    }
    :host(.danger) {
      color: var(--nx-danger);
    }
    :host([disabled]) {
      cursor: not-allowed;
      opacity: 0.45;
    }
    .check {
      margin-left: auto;
      color: var(--nx-accent-strong);
      font-weight: 700;
    }
  `,
  host: {
    tabindex: '-1',
    '[attr.role]': 'checked() === null ? "menuitem" : "menuitemradio"',
    '[attr.aria-checked]': 'checked()',
    '[class.danger]': 'danger()',
    '(click)': 'menu.close()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxMenuItem {
  readonly danger = input(false, { transform: booleanAttribute });
  readonly checked = input<boolean | null>(null);

  protected readonly menu = inject(NxMenu);
}

@Component({
  selector: 'nx-menu-separator',
  template: '',
  styles: `
    :host {
      display: block;
      height: 1px;
      margin: 6px 4px;
      background: var(--nx-border);
    }
  `,
  host: { role: 'separator' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxMenuSeparator {}

@Component({
  selector: 'nx-menu-label',
  template: '<ng-content />',
  styles: `
    :host {
      display: block;
      padding: 8px 12px 4px;
      color: var(--nx-text-muted);
      font-size: var(--nx-text-xs);
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
  `,
  host: { role: 'presentation' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxMenuLabel {}
