import { beforeEach, describe, expect, test } from 'vitest';
import {
  DEFAULT_THEME,
  THEME_KEY,
  applyTheme,
  parseTheme,
  readTheme,
  writeTheme,
} from './themeSettings';

describe('themeSettings', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
  });

  test('parseTheme accepts orbit and defaults otherwise', () => {
    expect(parseTheme('orbit')).toBe('orbit');
    expect(parseTheme('default')).toBe('default');
    expect(parseTheme(null)).toBe(DEFAULT_THEME);
    expect(parseTheme('invalid')).toBe('default');
  });

  test('read and write round-trip in localStorage', () => {
    if (typeof localStorage === 'undefined') return;
    expect(readTheme()).toBe('default');

    writeTheme('orbit');
    expect(localStorage.getItem(THEME_KEY)).toBe('orbit');
    expect(readTheme()).toBe('orbit');

    writeTheme('default');
    expect(readTheme()).toBe('default');
  });

  test('applyTheme sets orbit data-theme and dark class', () => {
    applyTheme('orbit');
    expect(document.documentElement.getAttribute('data-theme')).toBe('orbit');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  test('applyTheme clears orbit attribute for default', () => {
    applyTheme('orbit');
    applyTheme('default');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });
});
