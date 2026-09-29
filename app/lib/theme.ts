export type Theme = 'light' | 'dark';

export const DARK_QUERY = '(prefers-color-scheme: dark)';
export const THEME_STORAGE_KEY = 'theme';
export const THEME_CHANGE_EVENT = 'themechange';

// Runs in <head> before first paint so a pinned theme never flashes the other one.
export const THEME_SCRIPT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;
