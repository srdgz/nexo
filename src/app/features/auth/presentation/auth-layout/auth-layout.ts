import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Calendar, ListChecks, Wallet } from 'lucide';
import { type Language, isLanguage } from '@core/i18n/language';
import { LanguageService } from '@core/i18n/language.service';
import { NxIcon } from '@shared/ui/icon/icon';
import { NxLogo } from '@shared/ui/logo/logo';
import { NxSegmented, type SegmentedOption } from '@shared/ui/segmented/segmented';

@Component({
  selector: 'nx-auth-layout',
  imports: [NxIcon, NxLogo, NxSegmented, RouterLink, RouterOutlet, TranslocoPipe],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {
  protected readonly language = inject(LanguageService);
  protected readonly languages: readonly SegmentedOption<Language>[] = [
    { value: 'es', label: 'ES' },
    { value: 'en', label: 'EN' },
  ];
  protected readonly features = [
    { icon: Wallet, key: 'auth.brand.finances' },
    { icon: ListChecks, key: 'auth.brand.tasks' },
    { icon: Calendar, key: 'auth.brand.calendar' },
  ];

  protected changeLanguage(value: string): void {
    if (isLanguage(value)) {
      void this.language.use(value);
    }
  }
}
