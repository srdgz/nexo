import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  model,
  signal,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { FileUp } from 'lucide';
import { NxAlert } from '@shared/ui/alert/alert';
import { NxButton } from '@shared/ui/button/button';
import { NxDialog } from '@shared/ui/dialog/dialog';
import { NxIcon } from '@shared/ui/icon/icon';
import { ToastService } from '@shared/ui/toast/toast';
import { injectActiveLanguage, localeFor } from '@shared/util/active-language';
import { IMPORT_MAX_BYTES } from '@shared/util/download';
import { OrganizationService } from '../../application/organization.service';
import type { EventDraft } from '../../domain/calendar';
import { parseIcs } from '../../domain/ics';
import { toOrganizationError } from '../../domain/organization-error';

const PREVIEW_EVENTS = 5;

interface Found {
  readonly fresh: readonly EventDraft[];
  readonly duplicates: number;
  readonly skipped: number;
  readonly recurring: number;
}

@Component({
  selector: 'nx-import-events-dialog',
  imports: [NxAlert, NxButton, NxDialog, NxIcon, TranslocoPipe],
  template: `
    <nx-dialog [heading]="'organization.io.importTitle' | transloco" [(open)]="open">
      <div class="content">
        <p class="intro">{{ 'organization.io.importIntro' | transloco }}</p>
        <input
          #picker
          class="nx-visually-hidden"
          type="file"
          accept=".ics,text/calendar"
          tabindex="-1"
          aria-hidden="true"
          (change)="onFile(picker)"
        />
        <button nx-button variant="secondary" type="button" (click)="picker.click()">
          <svg nx-icon [icon]="icon" size="18"></svg>
          {{ (fileName() ? 'organization.io.chooseOther' : 'organization.io.choose') | transloco }}
        </button>
        @if (fileName(); as name) {
          <p class="file">{{ name }}</p>
        }

        @if (errorKey(); as key) {
          <nx-alert tone="danger">{{ key | transloco }}</nx-alert>
        }

        @if (result(); as found) {
          <p class="summary" role="status">
            {{ 'organization.io.summary' | transloco: { count: found.fresh.length } }}
          </p>
          @if (found.duplicates || found.skipped || found.recurring) {
            <nx-alert tone="info">
              <ul class="notes" role="list">
                @if (found.duplicates) {
                  <li>
                    {{ 'organization.io.duplicates' | transloco: { count: found.duplicates } }}
                  </li>
                }
                @if (found.skipped) {
                  <li>{{ 'organization.io.skipped' | transloco: { count: found.skipped } }}</li>
                }
                @if (found.recurring) {
                  <li>{{ 'organization.io.recurring' | transloco: { count: found.recurring } }}</li>
                }
              </ul>
            </nx-alert>
          }
          @if (preview().length) {
            <ul class="rows" role="list" [attr.aria-label]="'organization.io.preview' | transloco">
              @for (event of preview(); track $index) {
                <li>
                  <span class="date">{{ when(event) }}</span>
                  <span class="text">{{ event.title }}</span>
                </li>
              }
            </ul>
          }
          @if (found.fresh.length > preview().length) {
            <p class="more">
              {{
                'organization.io.more' | transloco: { count: found.fresh.length - preview().length }
              }}
            </p>
          }
        }
      </div>
      <button nx-button variant="secondary" dialog-actions type="button" (click)="open.set(false)">
        {{ 'organization.cancel' | transloco }}
      </button>
      <button
        nx-button
        dialog-actions
        type="button"
        [disabled]="!result()?.fresh?.length"
        [loading]="busy()"
        (click)="save()"
      >
        {{ 'organization.io.submit' | transloco: { count: result()?.fresh?.length ?? 0 } }}
      </button>
    </nx-dialog>
  `,
  styles: `
    .content {
      display: grid;
      gap: var(--nx-space-4);
      justify-items: start;
    }
    .content > nx-alert,
    .content > .rows,
    .content > p {
      justify-self: stretch;
    }
    .intro,
    .file,
    .more {
      margin: 0;
      color: var(--nx-text-muted);
      font-size: var(--nx-text-sm);
    }
    .file {
      overflow-wrap: anywhere;
    }
    .summary {
      margin: 0;
      font-weight: 600;
    }
    .rows {
      display: grid;
      margin: 0;
      padding: 0;
      border: 1px solid var(--nx-border);
      border-radius: var(--nx-radius-md);
      list-style: none;

      li {
        display: flex;
        min-width: 0;
        gap: var(--nx-space-3);
        align-items: baseline;
        padding: 8px 12px;
        font-size: var(--nx-text-sm);
      }
      li + li {
        border-top: 1px solid var(--nx-border);
      }
    }
    .notes {
      display: grid;
      gap: 2px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .date {
      flex: none;
      color: var(--nx-text-muted);
      font-variant-numeric: tabular-nums;
    }
    .text {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxImportEventsDialog {
  readonly open = model(false);

  private readonly organization = inject(OrganizationService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly language = injectActiveLanguage();

  protected readonly icon = FileUp;
  protected readonly fileName = signal<string | null>(null);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly result = signal<Found | null>(null);
  protected readonly busy = signal(false);

  protected readonly preview = computed(() =>
    (this.result()?.fresh ?? []).slice(0, PREVIEW_EVENTS),
  );

  constructor() {
    effect(() => {
      if (!this.open()) {
        this.reset();
      }
    });
  }

  protected async onFile(picker: HTMLInputElement): Promise<void> {
    const file = picker.files?.[0];
    picker.value = '';
    if (!file) {
      return;
    }
    this.reset();
    this.fileName.set(file.name);
    if (file.size > IMPORT_MAX_BYTES) {
      this.errorKey.set('organization.io.errors.tooBig');
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      this.errorKey.set('organization.io.errors.read');
      return;
    }
    const parsed = parseIcs(text);
    if (!parsed.ok) {
      this.errorKey.set(
        `organization.io.errors.${parsed.reason === 'too_many' ? 'tooMany' : parsed.reason}`,
      );
      return;
    }
    if (parsed.drafts.length === 0) {
      this.errorKey.set('organization.io.errors.empty');
      return;
    }
    try {
      const { fresh, duplicates } = await this.organization.newEvents(parsed.drafts);
      this.result.set({ fresh, duplicates, skipped: parsed.skipped, recurring: parsed.recurring });
    } catch (error) {
      this.errorKey.set(`organization.errors.${toOrganizationError(error).code}`);
    }
  }

  protected when(event: EventDraft): string {
    return new Intl.DateTimeFormat(localeFor(this.language()), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(event.startsAt));
  }

  protected async save(): Promise<void> {
    const drafts = this.result()?.fresh ?? [];
    if (drafts.length === 0 || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.errorKey.set(null);
    try {
      const count = await this.organization.importEvents(drafts);
      this.toast.success(this.transloco.translate('organization.io.imported', { count }));
      this.open.set(false);
    } catch (error) {
      this.errorKey.set(`organization.errors.${toOrganizationError(error).code}`);
    } finally {
      this.busy.set(false);
    }
  }

  private reset(): void {
    this.fileName.set(null);
    this.errorKey.set(null);
    this.result.set(null);
  }
}
