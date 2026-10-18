import { create } from 'zustand';
import { getAppSettings, setAppSettings } from '../ipc';

export type ThemePreference = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

interface ThemeState {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  init: () => Promise<void>;
  setTheme: (theme: ThemePreference) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

function resolveSystemTheme(): ResolvedTheme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

function applyThemeToDocument(resolved: ResolvedTheme): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', resolved);
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  resolvedTheme: 'dark',

  init: async () => {
    let savedTheme: ThemePreference = 'dark';
    try {
      const res = await getAppSettings();
      if (res.ok && res.value.theme) {
        savedTheme = res.value.theme;
      }
    } catch {
      // Ignore
    }

    const resolved = savedTheme === 'system' ? resolveSystemTheme() : savedTheme;
    applyThemeToDocument(resolved);
    set({ theme: savedTheme, resolvedTheme: resolved });

    // Listen for OS scheme changes if system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      media.addEventListener('change', () => {
        if (get().theme === 'system') {
          const newResolved = resolveSystemTheme();
          applyThemeToDocument(newResolved);
          set({ resolvedTheme: newResolved });
        }
      });
    }
  },

  setTheme: async (newTheme: ThemePreference) => {
    const resolved = newTheme === 'system' ? resolveSystemTheme() : newTheme;
    applyThemeToDocument(resolved);
    set({ theme: newTheme, resolvedTheme: resolved });
    try {
      await setAppSettings({ theme: newTheme });
    } catch {
      // Ignore
    }
  },

  toggleTheme: async () => {
    const current = get().resolvedTheme;
    const next: ThemePreference = current === 'dark' ? 'light' : 'dark';
    await get().setTheme(next);
  }
}));
