import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, email, form, minLength, required } from '@angular/forms/signals';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Ellipsis, Pencil, Plus, Search, Trash2 } from 'lucide';
import { NxAvatar } from '@shared/ui/avatar/avatar';
import { NxBadge } from '@shared/ui/badge/badge';
import { NxButton } from '@shared/ui/button/button';
import { NxCard, NxCardHeader } from '@shared/ui/card/card';
import { NxChip } from '@shared/ui/chip/chip';
import { NxCheckbox, NxSwitch } from '@shared/ui/choice/choice';
import { NxDialog } from '@shared/ui/dialog/dialog';
import { NxEmptyState, NxErrorState } from '@shared/ui/feedback-state/feedback-state';
import { NxField, NxInput } from '@shared/ui/field/field';
import { NxIconButton } from '@shared/ui/icon-button/icon-button';
import { NxLogo } from '@shared/ui/logo/logo';
import { NxMenu, NxMenuItem, NxMenuSeparator, NxMenuTrigger } from '@shared/ui/menu/menu';
import { NxMoneyInput } from '@shared/ui/money-input/money-input';
import { NxPasswordInput } from '@shared/ui/password-input/password-input';
import { NxProgress } from '@shared/ui/progress/progress';
import { NxSegmented, type SegmentedOption } from '@shared/ui/segmented/segmented';
import { NxSkeleton } from '@shared/ui/skeleton/skeleton';
import { NxStatCard } from '@shared/ui/stat-card/stat-card';
import { NxTab, NxTabNav } from '@shared/ui/tab-nav/tab-nav';
import { ToastService } from '@shared/ui/toast/toast';
import { NxIcon } from '@shared/ui/icon/icon';

interface SampleForm {
  email: string;
  password: string;
  amount: number | null;
  category: string;
  date: string;
  notes: string;
  remember: boolean;
}

@Component({
  selector: 'nx-ui-gallery',
  imports: [
    FormField,
    JsonPipe,
    NxIcon,
    NxAvatar,
    NxBadge,
    NxButton,
    NxCard,
    NxCardHeader,
    NxCheckbox,
    NxChip,
    NxDialog,
    NxEmptyState,
    NxErrorState,
    NxField,
    NxIconButton,
    NxInput,
    NxLogo,
    NxMenu,
    NxMenuItem,
    NxMenuSeparator,
    NxMenuTrigger,
    NxMoneyInput,
    NxPasswordInput,
    NxProgress,
    NxSegmented,
    NxSkeleton,
    NxStatCard,
    NxSwitch,
    NxTab,
    NxTabNav,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './ui-gallery.html',
  styleUrl: './ui-gallery.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiGallery {
  private readonly toast = inject(ToastService);

  protected readonly icons = {
    plus: Plus,
    pencil: Pencil,
    trash: Trash2,
    more: Ellipsis,
    search: Search,
  };

  protected readonly period = signal<'month' | 'week'>('month');
  protected readonly periods: readonly SegmentedOption<'month' | 'week'>[] = [
    { value: 'month', label: 'Mes' },
    { value: 'week', label: 'Semana' },
  ];
  protected readonly filter = signal<'all' | 'today' | 'high'>('all');
  protected readonly dialogOpen = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly notifications = signal(true);

  private readonly model = signal<SampleForm>({
    email: '',
    password: '',
    amount: 4590,
    category: 'home',
    date: '2026-11-11',
    notes: '',
    remember: false,
  });

  protected readonly sample = form(this.model, (path) => {
    required(path.email);
    email(path.email);
    required(path.password);
    minLength(path.password, 8);
    required(path.amount);
  });

  protected readonly formValue = this.model.asReadonly();

  protected save(): void {
    this.saving.set(true);
    setTimeout(() => {
      this.saving.set(false);
      this.toast.success('Movimiento guardado');
    }, 1200);
  }

  protected showToast(tone: 'success' | 'error' | 'info'): void {
    const messages = {
      success: 'Movimiento guardado',
      error: 'No se ha podido guardar. Inténtalo de nuevo.',
      info: 'Tienes 2 tareas para hoy',
    };
    this.toast.show(messages[tone], tone);
  }
}
