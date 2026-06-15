export const THEME_STORAGE_KEY = 'temptrack-theme';

export const THEME_OPTIONS = ['light', 'dark', 'system'];

/** @returns {'light' | 'dark' | 'system'} */
export function getStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (THEME_OPTIONS.includes(value)) return value;
  } catch {
    /* ignore */
  }
  return 'system';
}

/** @returns {'light' | 'dark'} */
export function getSystemTheme() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** @param {'light' | 'dark' | 'system'} preference */
export function resolveTheme(preference) {
  if (preference === 'system') return getSystemTheme();
  return preference;
}

/** Apply resolved theme to `<html>`. @returns {'light' | 'dark'} */
export function applyTheme(preference) {
  const resolved = resolveTheme(preference);
  const root = document.documentElement;
  root.classList.remove('light', 'dark');

  if (preference === 'light') {
    root.classList.add('light');
  } else if (preference === 'dark') {
    root.classList.add('dark');
  } else if (resolved === 'dark') {
    root.classList.add('dark');
  }

  root.style.colorScheme = resolved;
  return resolved;
}
