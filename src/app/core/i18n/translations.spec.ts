import en from '../../../../public/i18n/en.json';
import es from '../../../../public/i18n/es.json';

function keysOf(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    keysOf(child, prefix ? `${prefix}.${key}` : key),
  );
}

function emptyValues(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') {
    return value.trim() ? [] : [prefix];
  }
  if (typeof value !== 'object' || value === null) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    emptyValues(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('translation files', () => {
  it('have exactly the same keys in Spanish and English', () => {
    expect(keysOf(en).sort()).toEqual(keysOf(es).sort());
  });

  it('have no empty texts', () => {
    expect(emptyValues(es)).toEqual([]);
    expect(emptyValues(en)).toEqual([]);
  });
});
