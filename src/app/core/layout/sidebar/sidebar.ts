import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, booleanAttribute, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Link2 } from 'lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { NxAvatar } from '@shared/ui/avatar/avatar';
import { NxLogo } from '@shared/ui/logo/logo';
import type { CurrentUser } from '../../session/session';
import { DASHBOARD, SETTINGS, SIDEBAR_SECTIONS } from '../navigation';
import { NxIcon } from '@shared/ui/icon/icon';

@Component({
  selector: 'nx-sidebar',
  imports: [
    NxIcon,
    NgTemplateOutlet,
    NxAvatar,
    NxLogo,
    RouterLink,
    RouterLinkActive,
    TranslocoPipe,
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  host: { '[class.collapsed]': 'collapsed()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxSidebar {
  readonly collapsed = input(false, { transform: booleanAttribute });
  readonly user = input<CurrentUser | null>(null);
  readonly navigated = output();

  protected readonly dashboard = DASHBOARD;
  protected readonly sections = SIDEBAR_SECTIONS;
  protected readonly settings = SETTINGS;
  protected readonly tipIcon = Link2;
}
