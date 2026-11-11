import { DOCUMENT, inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { APP_MODE, RELOAD, enterDemo } from './app-mode';

export const demoEntryGuard: CanActivateFn = () => {
  if (inject(APP_MODE) === 'demo') {
    return inject(Router).createUrlTree(['/app/dashboard']);
  }
  enterDemo(inject(DOCUMENT));
  inject(RELOAD)('/app/dashboard');
  return false;
};
