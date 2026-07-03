import { useState, useCallback, useEffect } from 'react';

const PRESET_LINK_ID = 'timelinx-theme-preset';

type ThemeId = 'dark-pro' | 'light' | 'high-contrast';

const PRESET_PATHS: Record<ThemeId, string> = {
  'dark-pro':       '../../../packages/ui/src/presets/dark-pro.css',
  'light':          '../../../packages/ui/src/presets/light.css',
  'high-contrast':  '../../../packages/ui/src/presets/high-contrast.css',
};

function injectPreset(themeId: string) {
  const path = PRESET_PATHS[themeId as ThemeId];
  if (!path) return;

  // Remove any existing preset link
  const existing = document.getElementById(PRESET_LINK_ID);
  if (existing) existing.remove();

  const link = document.createElement('link');
  link.id = PRESET_LINK_ID;
  link.rel = 'stylesheet';
  link.href = path;
  document.head.appendChild(link);
}

export function useThemeManager(initial: ThemeId = 'dark-pro') {
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    try {
      return localStorage.getItem('timeline-demo-theme') || initial;
    } catch {
      return initial;
    }
  });

  const setTheme = useCallback((themeId: string) => {
    setCurrentTheme(themeId);
    try {
      localStorage.setItem('timeline-demo-theme', themeId);
    } catch {}
  }, []);

  useEffect(() => {
    injectPreset(currentTheme);
  }, [currentTheme]);

  return { currentTheme, setTheme };
}
