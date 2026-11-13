import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NxAvatar, initialsOf } from './avatar/avatar';
import { NxButton } from './button/button';
import { NxProgress, progressStatus } from './progress/progress';
import { NxSegmented } from './segmented/segmented';

describe('progressStatus', () => {
  it.each([
    [0, 400, 'ok'],
    [319, 400, 'ok'],
    [320, 400, 'warning'],
    [400, 400, 'warning'],
    [401, 400, 'over'],
    [10, 0, 'over'],
    [0, 0, 'ok'],
  ] as const)('%s of %s is %s', (value, max, status) => {
    expect(progressStatus(value, max)).toBe(status);
  });
});

describe('initialsOf', () => {
  it.each([
    ['Laura Martín', 'LM'],
    ['  laura   de la Fuente ', 'LD'],
    ['Álvaro', 'Á'],
    ['', ''],
  ])('"%s" gives "%s"', (name, initials) => {
    expect(initialsOf(name)).toBe(initials);
  });
});

@Component({
  imports: [NxButton, NxProgress, NxSegmented],
  template: `
    <button nx-button [loading]="loading()">Save</button>
    <a nx-button href="/x" [disabled]="true">Link</a>
    <nx-progress label="Food" valueText="450 of 400 €" [value]="450" [max]="400" />
    <nx-segmented label="Period" [options]="options" [(value)]="period" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly loading = signal(false);
  readonly period = signal<'month' | 'week'>('month');
  readonly options = [
    { value: 'month' as const, label: 'Month' },
    { value: 'week' as const, label: 'Week' },
  ];
}

describe('base components', () => {
  let root: HTMLElement;
  let host: Host;

  beforeEach(async () => {
    const fixture = TestBed.createComponent(Host);
    root = fixture.nativeElement;
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('disables a loading button and marks it busy', () => {
    const button = root.querySelector('button')!;
    expect(button.disabled).toBe(false);

    host.loading.set(true);
    TestBed.tick();

    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('.spinner')).not.toBeNull();
  });

  it('takes a disabled link out of the tab order', () => {
    const link = root.querySelector('a')!;

    expect(link.getAttribute('aria-disabled')).toBe('true');
    expect(link.getAttribute('tabindex')).toBe('-1');
  });

  it('exposes the progress value and caps the bar at 100 %', () => {
    const progress = root.querySelector('nx-progress')!;

    expect(progress.getAttribute('role')).toBe('progressbar');
    expect(progress.getAttribute('aria-valuetext')).toBe('450 of 400 €');
    expect(progress.classList).toContain('over');
    expect(progress.querySelector<HTMLElement>('.bar')!.style.width).toBe('100%');
  });

  it('selects a segment with native radios', () => {
    const radios = root.querySelectorAll<HTMLInputElement>('nx-segmented input[type=radio]');

    expect(root.querySelector('nx-segmented')!.getAttribute('role')).toBe('radiogroup');
    radios[1]!.click();
    TestBed.tick();

    expect(host.period()).toBe('week');
    expect(radios[1]!.checked).toBe(true);
  });
});

describe('NxAvatar', () => {
  it('loads photos without a referrer and falls back to the initials when one fails', async () => {
    const fixture = TestBed.createComponent(NxAvatar);
    fixture.componentRef.setInput('name', 'Laura Martín');
    fixture.componentRef.setInput('src', 'https://lh3.googleusercontent.com/a/photo');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const image = element.querySelector('img')!;

    expect(image.getAttribute('referrerpolicy')).toBe('no-referrer');

    image.dispatchEvent(new Event('error'));
    await fixture.whenStable();

    expect(element.querySelector('img')).toBeNull();
    expect(element.textContent?.trim()).toBe('LM');

    fixture.componentRef.setInput('src', 'https://res.cloudinary.com/nexo/image/upload/v2/a');
    await fixture.whenStable();

    expect(element.querySelector('img')).not.toBeNull();
  });
});
