'use client';

import { useSyncExternalStore } from 'react';
import { DARK_QUERY, THEME_CHANGE_EVENT, THEME_STORAGE_KEY, type Theme } from '../lib/theme';
import { Icon } from './Icons';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    media.removeEventListener('change', onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

function currentTheme(): Theme {
  const pinned = document.documentElement.dataset.theme;
  if (pinned === 'light' || pinned === 'dark') return pinned;
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => 'light' as Theme);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';

  function toggle() {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the theme still applies for this visit.
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
    </button>
  );
}
