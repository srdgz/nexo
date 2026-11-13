import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'nx-not-found',
  imports: [RouterLink, TranslocoPipe],
  template: `
    <main class="not-found">
      <p class="code nx-num" aria-hidden="true">404</p>
      <h1>{{ 'notFound.title' | transloco }}</h1>
      <p class="nx-muted">{{ 'notFound.description' | transloco }}</p>
      <a class="home" routerLink="/">{{ 'notFound.home' | transloco }}</a>
    </main>
  `,
  styles: `
    .not-found {
      display: grid;
      place-content: center;
      justify-items: center;
      gap: var(--nx-space-3);
      min-height: 100dvh;
      padding: var(--nx-space-6);
      text-align: center;
    }
    .code {
      font-size: var(--nx-text-hero);
      font-weight: 600;
      letter-spacing: -0.03em;
    }
    .home {
      margin-top: var(--nx-space-3);
      padding: var(--nx-space-3) var(--nx-space-6);
      border-radius: var(--nx-radius-pill);
      background: var(--nx-primary);
      color: var(--nx-on-primary);
      font-weight: 600;
      text-decoration: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {}
