import { TranslocoTestingModule } from '@jsverse/transloco';
import en from '../../public/i18n/en.json';
import es from '../../public/i18n/es.json';

export function provideTestI18n() {
  return TranslocoTestingModule.forRoot({
    langs: { es, en },
    translocoConfig: {
      availableLangs: ['es', 'en'],
      defaultLang: 'es',
      reRenderOnLangChange: true,
    },
    preloadLangs: true,
  });
}
