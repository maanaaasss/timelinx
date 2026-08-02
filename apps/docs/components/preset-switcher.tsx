'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const PRESETS = [
  { id: 'dark-pro', label: 'Dark Pro' },
  { id: 'light', label: 'Light' },
  { id: 'high-contrast', label: 'High Contrast' },
] as const;

type PresetId = (typeof PRESETS)[number]['id'];

export function PresetSwitcher() {
  const pathname = usePathname();
  const isUIPage = pathname.startsWith('/docs/ui');
  const [active, setActive] = useState<PresetId>('dark-pro');
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tlx-docs-preset') as PresetId | null;
      if (saved && PRESETS.some(p => p.id === saved)) {
        document.documentElement.dataset.preset = saved;
        setActive(saved);
      }
    } catch {}
    setMounted(true);
  }, []);

  const switchPreset = useCallback((id: PresetId) => {
    document.documentElement.dataset.preset = id;
    setActive(id);
    setOpen(false);
    try { localStorage.setItem('tlx-docs-preset', id); } catch {}
  }, []);

  if (!isUIPage || !mounted) return null;

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 50, fontFamily: 'var(--font-sans)' }}>
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 44,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            padding: 6,
            borderRadius: 10,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-lg)',
            minWidth: 150,
          }}
        >
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => switchPreset(preset.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 12px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: active === preset.id ? 600 : 400,
                color: active === preset.id ? 'var(--accent)' : 'var(--text-secondary)',
                background: active === preset.id ? 'var(--accent-subtle)' : 'transparent',
                textAlign: 'left',
                transition: 'all 120ms ease-out',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: active === preset.id ? 'var(--accent)' : 'var(--border-subtle)',
                  flexShrink: 0,
                }}
              />
              {preset.label}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Switch theme"
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          border: '1px solid var(--border-default)',
          background: 'var(--bg-panel)',
          boxShadow: 'var(--shadow-md)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 150ms ease-out',
          color: 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-default)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      </button>
    </div>
  );
}
