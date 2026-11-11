import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { filter, map } from 'rxjs';
import { HEADING_IN_SHELL } from '@shared/ui/pending-page/pending-page';
import { NxTab, NxTabNav } from '@shared/ui/tab-nav/tab-nav';
import { Session } from '../../session/session';
import { NxDemoBanner } from '../demo-banner/demo-banner';
import { NxAppHeader } from '../app-header/app-header';
import { NxBottomNav } from '../bottom-nav/bottom-nav';
import type { LayoutMode } from '../layout-mode';
import { injectMediaQuery } from '../media-query';
import { sectionFor } from '../navigation';
import { NxSidebar } from '../sidebar/sidebar';

@Component({
  selector: 'nx-app-shell',
  imports: [
    NxAppHeader,
    NxBottomNav,
    NxDemoBanner,
    NxSidebar,
    NxTab,
    NxTabNav,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TranslocoPipe,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
  providers: [{ provide: HEADING_IN_SHELL, useValue: true }],
  host: {
    '[class]': 'mode()',
    '(document:keydown.escape)': 'railOpen.set(false)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {
  private readonly router = inject(Router);
  private readonly isDesktop = injectMediaQuery('(min-width: 1024px)', true);
  private readonly isMobile = injectMediaQuery('(max-width: 767.98px)');
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  protected readonly session = inject(Session);
  protected readonly user = this.session.user;
  protected readonly railOpen = signal(false);

  protected readonly mode = computed<LayoutMode>(() => {
    if (this.isDesktop()) {
      return 'desktop';
    }
    return this.isMobile() ? 'mobile' : 'tablet';
  });

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly section = computed(() => sectionFor(this.url()));

  constructor() {
    effect(() => {
      this.url();
      this.mode();
      this.railOpen.set(false);
    });
  }

  protected skipToContent(): void {
    this.main().nativeElement.focus();
  }
}
