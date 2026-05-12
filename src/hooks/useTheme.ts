import { startTransition, useSyncExternalStore, type MouseEvent } from 'react';

export type Theme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'yaca-web-theme';
const subscribers = new Set<() => void>();
let currentTheme: Theme | null = null;

export function useTheme(): {
  theme: Theme;
  setTheme(theme: Theme): void;
  toggleTheme(event?: MouseEvent<HTMLElement>): void;
} {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);
  return {
    theme,
    setTheme,
    toggleTheme: (event) => toggleTheme(theme, event)
  };
}

function subscribeTheme(callback: () => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function getThemeSnapshot(): Theme {
  if (currentTheme === null) {
    currentTheme = readInitialTheme();
    applyTheme(currentTheme);
  }
  return currentTheme;
}

function getServerThemeSnapshot(): Theme {
  return 'dark';
}

function setTheme(theme: Theme): void {
  if (currentTheme === theme) return;
  currentTheme = theme;
  applyTheme(theme);
  for (const subscriber of subscribers) {
    subscriber();
  }
}

function toggleTheme(theme: Theme, event?: MouseEvent<HTMLElement>): void {
  const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
  const root = document.documentElement;
  if (event) {
    root.style.setProperty('--theme-circle-x', `${event.clientX}px`);
    root.style.setProperty('--theme-circle-y', `${event.clientY}px`);
    root.style.viewTransitionName = 'theme';
  }

  const withViewTransition = document as Document & {
    startViewTransition?: (update: () => void) => { finished: Promise<void> };
  };

  const cleanup = () => {
    root.style.viewTransitionName = '';
    root.style.removeProperty('--theme-circle-x');
    root.style.removeProperty('--theme-circle-y');
  };

  if (!event || !withViewTransition.startViewTransition) {
    startTransition(() => setTheme(nextTheme));
    cleanup();
    return;
  }

  const transition = withViewTransition.startViewTransition(() => {
    startTransition(() => setTheme(nextTheme));
  });
  transition.finished.finally(cleanup);
}

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
