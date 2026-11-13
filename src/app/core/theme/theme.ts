export type ThemePreference = 'system' | 'light' | 'dark';

export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'nexo.theme';

export const THEME_COLORS: Readonly<Record<ResolvedTheme, string>> = {
  light: '#f7f6f2',
  dark: '#0f1a20',
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (preference === 'system') {
    return systemDark ? 'dark' : 'light';
  }
  return preference;
}
