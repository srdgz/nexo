import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { ChevronDown, LogOut, Menu, PanelLeftClose, Plus } from 'lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { NxAvatar } from '@shared/ui/avatar/avatar';
import { NxButton } from '@shared/ui/button/button';
import { NxIconButton } from '@shared/ui/icon-button/icon-button';
import { NxLogo } from '@shared/ui/logo/logo';
import { NxMonthPicker } from '@shared/ui/month-picker/month-picker';
import {
  NxMenu,
  NxMenuItem,
  NxMenuLabel,
  NxMenuSeparator,
  NxMenuTrigger,
} from '@shared/ui/menu/menu';
import { type Language, SUPPORTED_LANGUAGES } from '../../i18n/language';
import { LanguageService } from '../../i18n/language.service';
import { TranslatedTitleStrategy } from '../../i18n/translated-title.strategy';
import { Session } from '../../session/session';
import type { LayoutMode } from '../layout-mode';
import { DASHBOARD, QUICK_ADD, SETTINGS } from '../navigation';
import { PageHeading } from '../page-heading';
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
    NxMonthPicker,
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

  private readonly router = inject(Router);
  private readonly navigation = toSignal(
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
    { initialValue: null },
  );

  protected readonly monthPicker = computed(() => {
    this.navigation();
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    const value = route.queryParamMap.get('month');
    return {
      visible: route.data['monthPicker'] === true,
      month: value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : currentMonth(),
    };
  });

  protected readonly titleKey = inject(TranslatedTitleStrategy).titleKey;
  protected readonly heading = inject(PageHeading);
  protected readonly session = inject(Session);
  protected readonly user = this.session.user;
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
    signOut: LogOut,
  };

  protected changeLanguage(language: Language): void {
    this.session.updatePreferences({ locale: language }).catch(() => undefined);
  }

  protected changeMonth(month: string): void {
    const tree = this.router.parseUrl(this.router.url);
    const params = { ...tree.queryParams };
    delete params['page'];
    delete params['month'];
    tree.queryParams = month === currentMonth() ? params : { ...params, month };
    void this.router.navigateByUrl(tree);
  }
}

function currentMonth(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}
