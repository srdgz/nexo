import { detectLanguage, isLanguage } from './language';

describe('detectLanguage', () => {
  it('uses the stored language when it is supported', () => {
    expect(detectLanguage('en', ['es-ES'])).toBe('en');
  });

  it('ignores an unsupported stored value', () => {
    expect(detectLanguage('fr', ['es-ES'])).toBe('es');
  });

  it('chooses Spanish for any Spanish browser locale', () => {
    expect(detectLanguage(null, ['es-MX', 'en-US'])).toBe('es');
    expect(detectLanguage(null, ['ES'])).toBe('es');
  });

  it('chooses English for any other browser language', () => {
    expect(detectLanguage(null, ['en-GB'])).toBe('en');
    expect(detectLanguage(null, ['de-DE', 'es-ES'])).toBe('en');
  });

  it('falls back to Spanish when the browser reports no language', () => {
    expect(detectLanguage(null, [])).toBe('es');
  });
});

describe('isLanguage', () => {
  it('accepts only supported codes', () => {
    expect(isLanguage('es')).toBe(true);
    expect(isLanguage('en')).toBe(true);
    expect(isLanguage('pt')).toBe(false);
    expect(isLanguage(undefined)).toBe(false);
  });
});
