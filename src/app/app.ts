import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NxToastOutlet } from '@shared/ui/toast/toast';

@Component({
  selector: 'nx-root',
  imports: [NxToastOutlet, RouterOutlet],
  template: `
    <router-outlet />
    <nx-toast-outlet />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
