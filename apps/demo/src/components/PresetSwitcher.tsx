import React from 'react';
import { Moon, Sun, Contrast } from 'lucide-react';

interface PresetSwitcherProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

const THEMES = [
  { id: 'dark-pro',       label: 'Dark',     icon: Moon,     swatch: '#5d88ff' },
  { id: 'light',          label: 'Light',    icon: Sun,      swatch: '#6366f1' },
  { id: 'high-contrast',  label: 'Hi-Con',   icon: Contrast, swatch: '#2979ff' },
];

export function PresetSwitcher({ currentTheme, onThemeChange }: PresetSwitcherProps) {
  return (
    <div className="theme-switcher">
      {THEMES.map((theme) => {
        const isActive = currentTheme === theme.id;
        const Icon = theme.icon;
        return (
          <button
            key={theme.id}
            onClick={() => onThemeChange(theme.id)}
            className={`theme-btn${isActive ? ' active' : ''}`}
            title={theme.label}
          >
            <span
              className="theme-swatch"
              style={{ background: theme.swatch, boxShadow: isActive ? `0 0 6px ${theme.swatch}` : 'none' }}
            />
            <Icon size={11} />
            {theme.label}
          </button>
        );
      })}
    </div>
  );
}
