import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { type RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

const APP_NAME = 'NEXO';

@Injectable({ providedIn: 'root' })
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly transloco = inject(TranslocoService);
  private readonly key = signal<string | undefined>(undefined);

  readonly titleKey = this.key.asReadonly();

  constructor() {
    super();
    this.transloco.langChanges$.pipe(takeUntilDestroyed()).subscribe(() => this.apply());
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.key.set(this.buildTitle(snapshot));
    this.apply();
  }

  private apply(): void {
    const titleKey = this.key();
    const translated = titleKey ? this.transloco.translate(titleKey) : '';
    const page = translated === titleKey ? '' : translated;
    this.title.setTitle(page ? `${page} · ${APP_NAME}` : APP_NAME);
  }
}
