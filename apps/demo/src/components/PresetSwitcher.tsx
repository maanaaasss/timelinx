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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      padding: 3,
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.04)',
    }}>
      {THEMES.map((theme) => {
        const isActive = currentTheme === theme.id;
        const Icon = theme.icon;
        return (
          <button
            key={theme.id}
            onClick={() => onThemeChange(theme.id)}
            style={{
              height: 26,
              padding: '0 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 500,
              fontFamily: 'inherit',
              color: isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
              }
            }}
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
