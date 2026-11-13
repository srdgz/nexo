import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Lock } from 'lucide';
import type { ThemePreference } from '@core/theme/theme';
import { ThemeService } from '@core/theme/theme.service';
import { AuthStore } from '@features/auth/application/auth-store';
import { type AuthErrorCode, toAuthError } from '@features/auth/domain/auth-error';
import type { UserLocale, WeekStart } from '@features/auth/domain/auth-user';
import { authMessageKey } from '@features/auth/presentation/auth-messages';
import { NxAlert } from '@shared/ui/alert/alert';
import { NxCard, NxCardHeader } from '@shared/ui/card/card';
import { NxIcon } from '@shared/ui/icon/icon';
import { NxSegmented, type SegmentedOption } from '@shared/ui/segmented/segmented';
import { ToastService } from '@shared/ui/toast/toast';
import { injectActiveLanguage, localeFor } from '@shared/util/active-language';
import { formatMoney } from '@shared/util/money';

const SAMPLE_CENTS = 184230;

@Component({
  selector: 'nx-preferences-page',
  imports: [NxAlert, NxCard, NxCardHeader, NxIcon, NxSegmented, TranslocoPipe],
  template: `
    @if (error(); as code) {
      <nx-alert class="error" tone="danger">{{ messageKey(code) | transloco }}</nx-alert>
    }
    <div class="layout">
      <div class="column">
        <nx-card>
          <nx-card-header [heading]="'settings.preferences.theme' | transloco" />
          <nx-segmented
            size="md"
            [label]="'settings.preferences.theme' | transloco"
            [options]="themes()"
            [value]="theme()"
            [disabled]="saving()"
            (valueChange)="changeTheme($event)"
          />
          <p class="muted">{{ 'settings.preferences.themeHint' | transloco }}</p>
        </nx-card>

        <nx-card>
          <nx-card-header [heading]="'settings.preferences.language' | transloco" />
          <nx-segmented
            size="md"
            [label]="'settings.preferences.language' | transloco"
            [options]="languages"
            [value]="language()"
            [disabled]="saving()"
            (valueChange)="changeLanguage($event)"
          />
          <p class="muted">{{ 'settings.preferences.languageHint' | transloco }}</p>
        </nx-card>
      </div>

      <div class="column">
        <nx-card>
          <nx-card-header [heading]="'settings.preferences.weekStart' | transloco" />
          <nx-segmented
            size="md"
            [label]="'settings.preferences.weekStart' | transloco"
            [options]="weekStarts()"
            [value]="weekStartsOn()"
            [disabled]="saving()"
            (valueChange)="changeWeekStart($event)"
          />
          <p class="muted">{{ 'settings.preferences.weekStartHint' | transloco }}</p>
        </nx-card>

        <nx-card>
          <nx-card-header [heading]="'settings.preferences.currency' | transloco" />
          <p class="locked">
            <span>{{ 'settings.preferences.euro' | transloco }}</span>
            <svg nx-icon [icon]="lockIcon" size="16"></svg>
          </p>
          <p class="muted">{{ 'settings.preferences.currencyHint' | transloco }}</p>
        </nx-card>
      </div>

      <nx-card class="wide" variant="muted">
        <nx-card-header [heading]="'settings.preferences.preview' | transloco" />
        <p class="preview">
          <b class="nx-num">{{ sampleAmount() }}</b>
          <span class="muted">{{ sampleDate() }}</span>
        </p>
      </nx-card>
    </div>
  `,
  styles: `
    @use 'mixins' as *;

    .error {
      margin-bottom: var(--nx-space-4);
    }
    .layout {
      display: grid;
      gap: var(--nx-space-4);
      align-items: start;

      @include bp(desktop) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    .wide {
      grid-column: 1 / -1;
    }
    .column {
      display: grid;
      gap: var(--nx-space-4);
      min-width: 0;
    }
    .muted {
      color: var(--nx-text-muted);
      font-size: var(--nx-text-sm);
    }
    .locked {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border: 1px solid var(--nx-border);
      border-radius: var(--nx-radius-md);
      background: var(--nx-surface-muted);
      color: var(--nx-text-muted);
    }
    .preview {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--nx-space-2);
    }
    .preview b {
      font-size: var(--nx-text-xl);
    }
    .preview span::first-letter {
      text-transform: uppercase;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreferencesPage {
  private readonly store = inject(AuthStore);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly active = injectActiveLanguage();
  protected readonly language = computed<UserLocale>(() => (this.active() === 'en' ? 'en' : 'es'));

  protected readonly lockIcon = Lock;
  protected readonly messageKey = authMessageKey;
  protected readonly saving = signal(false);
  protected readonly error = signal<AuthErrorCode | null>(null);

  protected readonly languages: readonly SegmentedOption<UserLocale>[] = [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' },
  ];

  protected readonly weekStarts = computed<readonly SegmentedOption<WeekStart>[]>(() => {
    this.language();
    return [
      { value: 1, label: this.transloco.translate('settings.preferences.monday') },
      { value: 0, label: this.transloco.translate('settings.preferences.sunday') },
    ];
  });

  protected readonly themes = computed<readonly SegmentedOption<ThemePreference>[]>(() => {
    this.language();
    return [
      { value: 'system', label: this.transloco.translate('settings.preferences.themeSystem') },
      { value: 'light', label: this.transloco.translate('settings.preferences.themeLight') },
      { value: 'dark', label: this.transloco.translate('settings.preferences.themeDark') },
    ];
  });

  protected readonly theme = inject(ThemeService).preference;

  protected readonly weekStartsOn = computed(() => this.store.authUser()?.weekStartsOn ?? 1);

  protected readonly sampleAmount = computed(() => formatMoney(SAMPLE_CENTS, this.language()));
  protected readonly sampleDate = computed(() =>
    new Intl.DateTimeFormat(localeFor(this.language()), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date()),
  );

  protected changeLanguage(locale: UserLocale): Promise<void> {
    return this.save({ locale });
  }

  protected changeTheme(theme: ThemePreference): Promise<void> {
    return this.save({ theme });
  }

  protected changeWeekStart(weekStartsOn: WeekStart): Promise<void> {
    return this.save({ weekStartsOn });
  }

  private async save(changes: {
    locale?: UserLocale;
    weekStartsOn?: WeekStart;
    theme?: ThemePreference;
  }): Promise<void> {
    this.error.set(null);
    this.saving.set(true);
    try {
      await this.store.updatePreferences(changes);
      this.toast.success(this.transloco.translate('settings.preferences.saved'));
    } catch (error) {
      this.error.set(toAuthError(error).code);
    } finally {
      this.saving.set(false);
    }
  }
}
