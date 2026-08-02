'use client';

import { useState, useCallback, useEffect } from 'react';

const PRESETS = [
  { id: 'dark-pro', label: 'Dark Pro' },
  { id: 'light', label: 'Light' },
  { id: 'high-contrast', label: 'High Contrast' },
] as const;

type PresetId = (typeof PRESETS)[number]['id'];

function getInitialPreset(): PresetId {
  if (typeof window === 'undefined') return 'dark-pro';
  return (document.documentElement.dataset.preset as PresetId) || 'dark-pro';
}

export function PresetSwitcher() {
  const [active, setActive] = useState<PresetId>('dark-pro');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setActive(getInitialPreset());
    setMounted(true);
  }, []);

  const switchPreset = useCallback((id: PresetId) => {
    document.documentElement.dataset.preset = id;
    setActive(id);
    try {
      localStorage.setItem('tlx-docs-preset', id);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tlx-docs-preset') as PresetId | null;
      if (saved && PRESETS.some(p => p.id === saved)) {
        switchPreset(saved);
      }
    } catch {}
  }, [switchPreset]);

  if (!mounted) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        borderRadius: 8,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        fontSize: 12,
        fontFamily: 'var(--font-sans)',
      }}
    >
      <span
        style={{
          color: 'var(--text-tertiary)',
          marginRight: 4,
          fontWeight: 500,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          fontSize: 10,
        }}
      >
        Theme
      </span>
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          onClick={() => switchPreset(preset.id)}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: active === preset.id ? 600 : 400,
            color:
              active === preset.id
                ? 'var(--accent-on-fill)'
                : 'var(--text-secondary)',
            background:
              active === preset.id ? 'var(--accent)' : 'transparent',
            transition: 'all 120ms ease-out',
          }}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
