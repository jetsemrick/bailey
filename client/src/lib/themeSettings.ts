export type ThemeId = 'default' | 'orbit';

export const THEME_KEY = 'bailey-theme';
export const THEME_CHANGE_EVENT = 'bailey-theme-change';
export const DEFAULT_THEME: ThemeId = 'default';

export const THEMES: { id: ThemeId; label: string; description: string }[] = [
  {
    id: 'default',
    label: 'Bailey',
    description: 'Warm paper and ink. Follows your system light or dark setting.',
  },
  {
    id: 'orbit',
    label: 'Orbit',
    description: 'Near-black aerospace contrast inspired by spacex.com.',
  },
];

export function parseTheme(value: string | null): ThemeId {
  return value === 'orbit' ? 'orbit' : DEFAULT_THEME;
}

export function readTheme(): ThemeId {
  try {
    return parseTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

export function writeTheme(theme: ThemeId): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
  } catch {
    /* quota / private mode */
  }
}

export function prefersDarkScheme(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

/** Apply data-theme / dark class so CSS variables and Tailwind dark: stay in sync. */
export function applyTheme(theme: ThemeId): void {
  const root = document.documentElement;
  if (theme === 'orbit') {
    root.setAttribute('data-theme', 'orbit');
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
    return;
  }

  root.removeAttribute('data-theme');
  if (prefersDarkScheme()) {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}
