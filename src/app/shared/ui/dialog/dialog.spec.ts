import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTestI18n } from '../../../../testing/i18n';
import { NxDialog } from './dialog';

@Component({
  imports: [NxDialog],
  template: `
    <nx-dialog
      heading="Delete it?"
      description="This cannot be undone."
      [(open)]="open"
      (closed)="closedCount = closedCount + 1"
    >
      <p>Body</p>
      <button dialog-actions type="button">Confirm</button>
    </nx-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly open = signal(false);
  closedCount = 0;
}

describe('NxDialog', () => {
  let dialog: HTMLDialogElement;
  let host: Host;

  beforeEach(async () => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    });

    TestBed.configureTestingModule({ imports: [provideTestI18n()] });
    const fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    dialog = fixture.nativeElement.querySelector('dialog');
    await fixture.whenStable();
  });

  it('opens as a modal labelled by its heading and description', () => {
    host.open.set(true);
    TestBed.tick();

    expect(dialog.showModal).toHaveBeenCalledTimes(1);
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe(
      'Delete it?',
    );
    expect(document.getElementById(dialog.getAttribute('aria-describedby')!)?.textContent).toBe(
      'This cannot be undone.',
    );
  });

  it('closes from the close button and notifies the parent', () => {
    host.open.set(true);
    TestBed.tick();

    dialog.querySelector<HTMLButtonElement>('.close')!.click();
    TestBed.tick();

    expect(host.open()).toBe(false);
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(host.closedCount).toBe(1);
  });

  it('closes when the backdrop is clicked but not when the content is', () => {
    host.open.set(true);
    TestBed.tick();

    dialog.querySelector('p')!.click();
    TestBed.tick();
    expect(host.open()).toBe(true);

    dialog.click();
    TestBed.tick();
    expect(host.open()).toBe(false);
  });

  it('syncs the model when the browser closes it with Escape', () => {
    host.open.set(true);
    TestBed.tick();

    dialog.removeAttribute('open');
    dialog.dispatchEvent(new Event('close'));
    TestBed.tick();

    expect(host.open()).toBe(false);
  });
});
