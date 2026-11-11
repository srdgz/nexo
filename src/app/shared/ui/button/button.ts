import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'button[nx-button], a[nx-button]',
  template: `
    @if (loading()) {
      <span class="spinner" aria-hidden="true"></span>
    }
    <ng-content />
  `,
  styleUrl: './button.scss',
  host: {
    '[class]': 'classes()',
    '[attr.disabled]': 'isNativeButton && inactive() ? "" : null',
    '[attr.aria-disabled]': '!isNativeButton && inactive() ? "true" : null',
    '[attr.tabindex]': '!isNativeButton && inactive() ? -1 : null',
    '[attr.aria-busy]': 'loading() ? "true" : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxButton {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly block = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly isNativeButton =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'BUTTON';

  protected readonly inactive = computed(() => this.disabled() || this.loading());

  protected readonly classes = computed(() => [
    'nx-button',
    this.variant(),
    this.size(),
    this.block() ? 'block' : '',
    this.loading() ? 'loading' : '',
  ]);
}
