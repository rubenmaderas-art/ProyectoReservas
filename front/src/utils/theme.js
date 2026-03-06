export const THEME_STORAGE_KEY = 'theme';

export const getStoredTheme = () =>
  localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';

export const getStoredDarkMode = () => getStoredTheme() === 'dark';

export const applyTheme = (theme) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;
  const isDark = theme === 'dark';

  root.classList.toggle('dark', isDark);
  body.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
};

export const persistAndApplyTheme = (theme) => {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
};
