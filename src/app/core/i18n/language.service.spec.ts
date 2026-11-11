import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import en from '../../../../public/i18n/en.json';
import es from '../../../../public/i18n/es.json';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { es, en },
          translocoConfig: { availableLangs: ['es', 'en'], defaultLang: 'es' },
          preloadLangs: true,
        }),
      ],
    });
  });

  it('switches the active language, the html lang attribute and remembers the choice', async () => {
    const service = TestBed.inject(LanguageService);

    await service.use('en');

    expect(service.current()).toBe('en');
    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('en');
    expect(TestBed.inject(DOCUMENT).documentElement.lang).toBe('en');
    expect(localStorage.getItem('nexo.language')).toBe('en');
  });

  it('starts with the remembered language', async () => {
    localStorage.setItem('nexo.language', 'en');
    const service = TestBed.inject(LanguageService);

    await service.init();

    expect(service.current()).toBe('en');
  });
});
