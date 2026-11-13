import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { isThemePreference, resolveTheme } from './theme';
import { ThemeService } from './theme.service';

describe('resolveTheme', () => {
  it('follows the system only when asked to', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('recognises stored preferences', () => {
    expect(isThemePreference('dark')).toBe(true);
    expect(isThemePreference('sepia')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });
});

describe('ThemeService', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('marks the document and remembers the choice', () => {
    const service = TestBed.inject(ThemeService);
    const root = TestBed.inject(DOCUMENT).documentElement;

    service.use('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('nexo.theme')).toBe('dark');
    expect(service.resolved()).toBe('dark');

    service.use('system');
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('starts from the stored choice', () => {
    localStorage.setItem('nexo.theme', 'light');

    expect(TestBed.inject(ThemeService).preference()).toBe('light');
  });
});
