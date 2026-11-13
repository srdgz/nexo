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
import { injectActiveLanguage } from '@shared/util/active-language';
import { parseCsv } from '@shared/util/csv';
import { IMPORT_MAX_BYTES } from '@shared/util/download';
import { FinanceService } from '../../application/finance.service';
import type { Category } from '../../domain/category';
import { toFinanceError } from '../../domain/finance-error';
import { type ImportRow, parseTransactionCsv } from '../../domain/transaction-csv';
import { shortDate, signedMoney } from '../finance-format';
import { financeMessageKey } from '../finance-messages';

const PREVIEW_ROWS = 5;

@Component({
  selector: 'nx-import-transactions-dialog',
  imports: [NxAlert, NxButton, NxDialog, NxIcon, TranslocoPipe],
  template: `
    <nx-dialog [heading]="'finances.io.importTitle' | transloco" [(open)]="open">
      <div class="content">
        <p class="intro">{{ 'finances.io.importIntro' | transloco }}</p>
        <input
          #picker
          class="nx-visually-hidden"
          type="file"
          accept=".csv,text/csv"
          tabindex="-1"
          aria-hidden="true"
          (change)="onFile(picker)"
        />
        <button nx-button variant="secondary" type="button" (click)="picker.click()">
          <svg nx-icon [icon]="icon" size="18"></svg>
          {{ (fileName() ? 'finances.io.chooseOther' : 'finances.io.choose') | transloco }}
        </button>
        @if (fileName(); as name) {
          <p class="file">{{ name }}</p>
        }

        @if (errorKey(); as key) {
          <nx-alert tone="danger">{{ key | transloco }}</nx-alert>
        }

        @if (rows().length) {
          <p class="summary" role="status">
            {{
              'finances.io.summary'
                | transloco: { valid: valid().length, invalid: invalid().length }
            }}
          </p>
          @if (invalid().length) {
            <nx-alert tone="info">{{ 'finances.io.invalidHint' | transloco }}</nx-alert>
            <ul class="rows problems" role="list">
              @for (row of invalid(); track row.line) {
                <li>
                  <span class="line">{{ 'finances.io.line' | transloco: { line: row.line } }}</span>
                  <span class="problem">{{ describe(row) }}</span>
                </li>
              }
            </ul>
          }
          @if (valid().length) {
            <ul class="rows" role="list" [attr.aria-label]="'finances.io.preview' | transloco">
              @for (row of preview(); track row.line) {
                <li>
                  <span class="date">{{ date(row.date) }}</span>
                  <span class="text">{{ row.description || row.category }}</span>
                  <span class="amount" [class.income]="row.type === 'income'">{{
                    amount(row)
                  }}</span>
                </li>
              }
            </ul>
            @if (valid().length > preview().length) {
              <p class="more">
                {{ 'finances.io.more' | transloco: { count: valid().length - preview().length } }}
              </p>
            }
          }
        }
      </div>
      <button nx-button variant="secondary" dialog-actions type="button" (click)="open.set(false)">
        {{ 'finances.cancel' | transloco }}
      </button>
      <button
        nx-button
        dialog-actions
        type="button"
        [disabled]="valid().length === 0"
        [loading]="busy()"
        (click)="save()"
      >
        {{ 'finances.io.submit' | transloco: { count: valid().length } }}
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
      max-height: 220px;
      margin: 0;
      padding: 0;
      overflow-y: auto;
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
    .line,
    .date {
      flex: none;
      color: var(--nx-text-muted);
      font-variant-numeric: tabular-nums;
    }
    .problem {
      min-width: 0;
      color: var(--nx-danger);
    }
    .text {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .amount {
      flex: none;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    .amount.income {
      color: var(--nx-success);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxImportTransactionsDialog {
  readonly open = model(false);

  private readonly finance = inject(FinanceService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly language = injectActiveLanguage();

  protected readonly icon = FileUp;
  protected readonly fileName = signal<string | null>(null);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly rows = signal<readonly ImportRow[]>([]);
  protected readonly busy = signal(false);

  protected readonly valid = computed(() => this.rows().filter((row) => row.draft));
  protected readonly invalid = computed(() => this.rows().filter((row) => !row.draft));
  protected readonly preview = computed(() => this.valid().slice(0, PREVIEW_ROWS));

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
      this.errorKey.set('finances.io.errors.tooBig');
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      this.errorKey.set('finances.io.errors.read');
      return;
    }
    let categories: Category[];
    try {
      categories = await this.finance.categories();
    } catch (error) {
      this.errorKey.set(financeMessageKey(toFinanceError(error).code));
      return;
    }
    const result = parseTransactionCsv(parseCsv(text), categories);
    if (!result.ok) {
      this.errorKey.set(
        `finances.io.errors.${result.reason === 'too_many' ? 'tooMany' : result.reason}`,
      );
      return;
    }
    this.rows.set(result.rows);
  }

  protected describe(row: ImportRow): string {
    return row.problems
      .map((problem) =>
        this.transloco.translate(`finances.io.problems.${problem}`, { name: row.category }),
      )
      .join(' · ');
  }

  protected date(isoDay: string): string {
    return shortDate(isoDay, this.language());
  }

  protected amount(row: ImportRow): string {
    return signedMoney({ type: row.type ?? 'expense', amount: row.amount ?? 0 }, this.language());
  }

  protected async save(): Promise<void> {
    const drafts = this.valid().flatMap((row) => (row.draft ? [row.draft] : []));
    if (drafts.length === 0 || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.errorKey.set(null);
    try {
      const count = await this.finance.importTransactions(drafts);
      this.toast.success(this.transloco.translate('finances.io.imported', { count }));
      this.open.set(false);
    } catch (error) {
      this.errorKey.set(financeMessageKey(toFinanceError(error).code));
    } finally {
      this.busy.set(false);
    }
  }

  private reset(): void {
    this.fileName.set(null);
    this.errorKey.set(null);
    this.rows.set([]);
  }
}
