import React from 'react';
import { Moon, Sun, Contrast } from 'lucide-react';

interface PresetSwitcherProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

const THEMES = [
  { id: 'dark-pro', label: 'Dark', icon: Moon },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'high-contrast', label: 'Contrast', icon: Contrast },
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
            <Icon size={12} />
            {theme.label}
          </button>
        );
      })}
    </div>
  );
}
