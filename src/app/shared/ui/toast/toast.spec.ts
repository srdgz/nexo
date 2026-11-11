import { TestBed } from '@angular/core/testing';
import { provideTestI18n } from '../../../../testing/i18n';
import { NxToastOutlet, ToastService } from './toast';

describe('Toasts', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [provideTestI18n()] });
  });

  it('dismisses toasts automatically, errors later than the rest', () => {
    vi.useFakeTimers();
    const service = TestBed.inject(ToastService);

    service.success('Saved');
    service.error('Failed');
    vi.advanceTimersByTime(5000);
    expect(service.toasts().map((toast) => toast.message)).toEqual(['Failed']);

    vi.advanceTimersByTime(3000);
    expect(service.toasts()).toEqual([]);
    vi.useRealTimers();
  });

  it('announces errors as alerts and the rest politely', async () => {
    const fixture = TestBed.createComponent(NxToastOutlet);
    const service = TestBed.inject(ToastService);

    service.info('Two tasks for today');
    service.error('Could not save');
    await fixture.whenStable();

    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('[role=status]')?.textContent).toContain('Two tasks for today');
    expect(root.querySelector('[role=alert]')?.textContent).toContain('Could not save');
  });

  it('removes a toast from its close button', async () => {
    const fixture = TestBed.createComponent(NxToastOutlet);
    TestBed.inject(ToastService).success('Saved');
    await fixture.whenStable();

    fixture.nativeElement.querySelector('nx-toast button').click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('nx-toast')).toBeNull();
  });
});
