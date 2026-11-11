import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { SUPPORTED_LANGUAGES } from '@core/i18n/language';
import { LanguageService } from '@core/i18n/language.service';
import { MAIN_NAVIGATION } from '../navigation';

@Component({
  selector: 'nx-app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslocoPipe],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {
  protected readonly language = inject(LanguageService);
  protected readonly navigation = MAIN_NAVIGATION;
  protected readonly languages = SUPPORTED_LANGUAGES;
}
