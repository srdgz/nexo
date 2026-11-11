import { ChangeDetectionStrategy, Component, InjectionToken, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

export const HEADING_IN_SHELL = new InjectionToken<boolean>('HEADING_IN_SHELL', {
  factory: () => false,
});

@Component({
  selector: 'nx-pending-page',
  imports: [TranslocoPipe],
  template: `
    <section class="pending">
      @if (!headingInShell) {
        <h1>{{ titleKey | transloco }}</h1>
      }
      <p class="nx-muted">{{ 'pending.description' | transloco }}</p>
    </section>
  `,
  styles: `
    .pending {
      display: grid;
      gap: var(--nx-space-3);
      max-width: 60ch;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingPage {
  protected readonly titleKey = inject(ActivatedRoute).snapshot.title ?? 'app.name';
  protected readonly headingInShell = inject(HEADING_IN_SHELL);
}
