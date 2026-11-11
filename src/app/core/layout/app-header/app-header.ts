import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChevronDown, Menu, PanelLeftClose, Plus } from 'lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { NxAvatar } from '@shared/ui/avatar/avatar';
import { NxButton } from '@shared/ui/button/button';
import { NxIconButton } from '@shared/ui/icon-button/icon-button';
import { NxLogo } from '@shared/ui/logo/logo';
import {
  NxMenu,
  NxMenuItem,
  NxMenuLabel,
  NxMenuSeparator,
  NxMenuTrigger,
} from '@shared/ui/menu/menu';
import { SUPPORTED_LANGUAGES } from '../../i18n/language';
import { LanguageService } from '../../i18n/language.service';
import { TranslatedTitleStrategy } from '../../i18n/translated-title.strategy';
import { CurrentUserStore } from '../../session/current-user';
import type { LayoutMode } from '../layout-mode';
import { DASHBOARD, QUICK_ADD, SETTINGS } from '../navigation';
import { NxIcon } from '@shared/ui/icon/icon';

@Component({
  selector: 'nx-app-header',
  imports: [
    NxIcon,
    NxAvatar,
    NxButton,
    NxIconButton,
    NxLogo,
    NxMenu,
    NxMenuItem,
    NxMenuLabel,
    NxMenuSeparator,
    NxMenuTrigger,
    RouterLink,
    TranslocoPipe,
  ],
  templateUrl: './app-header.html',
  styleUrl: './app-header.scss',
  host: { '[class]': 'mode()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxAppHeader {
  readonly mode = input.required<LayoutMode>();
  readonly railOpen = input(false);
  readonly toggleRail = output();

  protected readonly titleKey = inject(TranslatedTitleStrategy).titleKey;
  protected readonly user = inject(CurrentUserStore).user;
  protected readonly language = inject(LanguageService);
  protected readonly languages = SUPPORTED_LANGUAGES;
  protected readonly dashboard = DASHBOARD;
  protected readonly quickAdd = QUICK_ADD;
  protected readonly settingsItems = SETTINGS.items;
  protected readonly icons = {
    menu: Menu,
    collapse: PanelLeftClose,
    plus: Plus,
    chevron: ChevronDown,
  };
}
