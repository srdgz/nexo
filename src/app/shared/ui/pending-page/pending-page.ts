import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'nx-pending-page',
  imports: [TranslocoPipe],
  template: `
    <section class="pending" aria-labelledby="pending-title">
      <h1 id="pending-title">{{ titleKey | transloco }}</h1>
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
}
