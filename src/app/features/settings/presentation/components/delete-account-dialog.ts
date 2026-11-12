import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  model,
  signal,
  untracked,
} from '@angular/core';
import { FormField, form, submit, validate } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthStore } from '@features/auth/application/auth-store';
import { type AuthErrorCode, toAuthError } from '@features/auth/domain/auth-error';
import { DELETE_CONFIRMATION } from '@features/auth/domain/auth-user';
import { authMessageKey } from '@features/auth/presentation/auth-messages';
import { NxAlert } from '@shared/ui/alert/alert';
import { NxButton } from '@shared/ui/button/button';
import { NxDialog } from '@shared/ui/dialog/dialog';
import { NxField, NxInput } from '@shared/ui/field/field';
import { injectActiveLanguage } from '@shared/util/active-language';

@Component({
  selector: 'nx-delete-account-dialog',
  imports: [FormField, NxAlert, NxButton, NxDialog, NxField, NxInput, TranslocoPipe],
  template: `
    <nx-dialog
      size="sm"
      [heading]="'settings.profile.deleteTitle' | transloco"
      [description]="'settings.profile.deleteText' | transloco"
      [(open)]="open"
    >
      <form class="form" novalidate (submit)="onSubmit($event)">
        @if (error(); as code) {
          <nx-alert tone="danger">{{ messageKey(code) | transloco }}</nx-alert>
        }
        <nx-field
          [label]="'settings.profile.deleteConfirm' | transloco: { word: word() }"
          [state]="confirmation.word()"
        >
          <input nxInput autocomplete="off" spellcheck="false" [formField]="confirmation.word" />
        </nx-field>
      </form>
      <button nx-button variant="secondary" dialog-actions type="button" (click)="open.set(false)">
        {{ 'settings.cancel' | transloco }}
      </button>
      <button
        nx-button
        variant="danger"
        dialog-actions
        type="button"
        [disabled]="!matches()"
        [loading]="confirmation().submitting()"
        (click)="onSubmit($event)"
      >
        {{ 'settings.profile.deleteAction' | transloco }}
      </button>
    </nx-dialog>
  `,
  styles: `
    .form {
      display: grid;
      gap: var(--nx-space-4);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxDeleteAccountDialog {
  readonly open = model(false);

  private readonly store = inject(AuthStore);
  private readonly language = injectActiveLanguage();

  protected readonly messageKey = authMessageKey;
  protected readonly word = computed(() =>
    this.language() === 'en' ? DELETE_CONFIRMATION.en : DELETE_CONFIRMATION.es,
  );
  private readonly model = signal({ word: '' });
  protected readonly confirmation = form(this.model, (path) => {
    validate(path.word, ({ value }) =>
      value().trim() === this.word() ? undefined : { kind: 'pattern' },
    );
  });
  protected readonly matches = computed(() => this.model().word.trim() === this.word());
  protected readonly error = signal<AuthErrorCode | null>(null);

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      untracked(() => {
        this.error.set(null);
        this.model.set({ word: '' });
        this.confirmation().reset();
      });
    });
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.matches()) {
      return;
    }
    this.error.set(null);
    await submit(this.confirmation, async () => {
      try {
        await this.store.deleteAccount();
        this.open.set(false);
      } catch (error) {
        this.error.set(toAuthError(error).code);
      }
      return undefined;
    });
  }
}
