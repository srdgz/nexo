import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { type Language, detectLanguage } from './language';

const STORAGE_KEY = 'nexo.language';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);
  private readonly currentLanguage = signal<Language>(
    this.transloco.getActiveLang() === 'en' ? 'en' : 'es',
  );

  readonly current = this.currentLanguage.asReadonly();

  init(): Promise<void> {
    const browserLanguages = this.document.defaultView?.navigator.languages ?? [];
    return this.use(detectLanguage(this.readStored(), browserLanguages));
  }

  async use(language: Language): Promise<void> {
    await firstValueFrom(this.transloco.load(language));
    this.transloco.setActiveLang(language);
    this.document.documentElement.lang = language;
    this.currentLanguage.set(language);
    this.store(language);
  }

  private readStored(): string | null {
    try {
      return this.document.defaultView?.localStorage.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private store(language: Language): void {
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      return;
    }
  }
}
