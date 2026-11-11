import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { APP_MODE, RELOAD, clearDemoData, readAppMode } from './app-mode';
import { demoEntryGuard } from './demo-entry.guard';

describe('app mode', () => {
  beforeEach(() => sessionStorage.clear());

  it('is real unless the demo flag is stored', () => {
    const document = TestBed.inject(DOCUMENT);
    expect(readAppMode(document)).toBe('real');

    sessionStorage.setItem('nexo.mode', 'demo');
    expect(readAppMode(document)).toBe('demo');
  });

  it('clears only the demo data', () => {
    sessionStorage.setItem('nexo.mode', 'demo');
    sessionStorage.setItem('nexo.demo.tasks', '[]');
    sessionStorage.setItem('nexo.pendingEmail', 'a@b.c');

    clearDemoData(TestBed.inject(DOCUMENT));

    expect(sessionStorage.getItem('nexo.demo.tasks')).toBeNull();
    expect(sessionStorage.getItem('nexo.mode')).toBe('demo');
    expect(sessionStorage.getItem('nexo.pendingEmail')).toBe('a@b.c');
  });

  describe('/demo', () => {
    const reload = vi.fn();

    function setup(mode: 'real' | 'demo') {
      reload.mockClear();
      TestBed.configureTestingModule({
        providers: [
          provideRouter([
            { path: 'demo', canActivate: [demoEntryGuard], children: [] },
            { path: 'app/dashboard', children: [] },
          ]),
          { provide: APP_MODE, useValue: mode },
          { provide: RELOAD, useValue: reload },
        ],
      });
    }

    it('turns demo mode on and reloads into the dashboard', async () => {
      setup('real');
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl('/demo');

      expect(sessionStorage.getItem('nexo.mode')).toBe('demo');
      expect(reload).toHaveBeenCalledWith('/app/dashboard');
    });

    it('goes straight to the dashboard when the demo is already on', async () => {
      setup('demo');
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl('/demo');

      expect(reload).not.toHaveBeenCalled();
      expect(TestBed.inject(Router).url).toBe('/app/dashboard');
    });
  });
});
