import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  effect,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { X } from 'lucide';
import { uniqueId } from '../../util/unique-id';
import { NxIcon } from '../icon/icon';
import { NxIconButton } from '../icon-button/icon-button';

export type DialogPresentation = 'auto' | 'sheet';

@Component({
  selector: 'nx-dialog',
  imports: [NxIcon, NxIconButton, TranslocoPipe],
  templateUrl: './dialog.html',
  styleUrl: './dialog.scss',
  host: { '(click)': 'onClick($event)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxDialog {
  readonly open = model(false);
  readonly heading = input.required<string>();
  readonly description = input('');
  readonly size = input<'sm' | 'md'>('md');
  readonly presentation = input<DialogPresentation>('auto');
  readonly closed = output();

  protected readonly titleId = uniqueId('nx-dialog-title');
  protected readonly descriptionId = `${this.titleId}-description`;
  protected readonly closeIcon = X;

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const element = this.dialog().nativeElement;
      if (this.open() && !element.open) {
        element.showModal();
      } else if (!this.open() && element.open) {
        element.close();
      }
    });
  }

  close(): void {
    this.open.set(false);
  }

  protected onClose(): void {
    if (this.open()) {
      this.open.set(false);
    }
    this.closed.emit();
  }

  protected onClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }
}
