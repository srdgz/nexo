import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Plus } from 'lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { NxDialog } from '@shared/ui/dialog/dialog';
import { DASHBOARD, FINANCES, ORGANIZATION, QUICK_ADD, SETTINGS } from '../navigation';
import { NxIcon } from '@shared/ui/icon/icon';

@Component({
  selector: 'nx-bottom-nav',
  imports: [NxIcon, NxDialog, RouterLink, RouterLinkActive, TranslocoPipe],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxBottomNav {
  protected readonly before = [DASHBOARD, FINANCES];
  protected readonly after = [ORGANIZATION, SETTINGS];
  protected readonly quickAdd = QUICK_ADD;
  protected readonly plusIcon = Plus;
  protected readonly quickAddOpen = signal(false);
}
