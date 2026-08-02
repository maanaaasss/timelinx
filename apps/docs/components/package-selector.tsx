'use client';

import { useState, useRef, useEffect } from 'react';
import { Building2, Layers, Cpu, Atom, BookOpen } from 'lucide-react';

const PACKAGES = [
  {
    id: 'library',
    name: 'Library',
    description: 'Framework & tooling',
    icon: BookOpen,
    color: '#818cf8',
    bg: 'rgba(129, 140, 248, 0.12)',
  },
  {
    id: 'ui',
    name: 'Timelinx UI',
    description: 'Pre-built components',
    icon: Layers,
    color: '#c084fc',
    bg: 'rgba(192, 132, 252, 0.12)',
  },
  {
    id: 'core',
    name: 'Timelinx Core',
    description: 'Timeline engine',
    icon: Cpu,
    color: '#fb923c',
    bg: 'rgba(251, 146, 60, 0.12)',
  },
  {
    id: 'react',
    name: 'Timelinx React',
    description: 'React bindings',
    icon: Atom,
    color: '#22d3ee',
    bg: 'rgba(34, 211, 238, 0.12)',
  },
] as const;

type PackageId = (typeof PACKAGES)[number]['id'];

export function PackageSelector() {
  const [selected, setSelected] = useState<PackageId>('library');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = PACKAGES.find(p => p.id === selected)!;
  const CurrentIcon = current.icon;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 14px',
          borderRadius: 10,
          border: '1px solid var(--border-default)',
          background: current.bg,
          cursor: 'pointer',
          color: current.color,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'var(--font-sans)',
          transition: 'all 150ms ease-out',
        }}
      >
        <CurrentIcon size={16} />
        {current.name}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease-out',
            opacity: 0.6,
          }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 6,
            padding: 6,
            borderRadius: 12,
            border: '1px solid var(--border-default)',
            background: 'var(--bg-panel)',
            boxShadow: 'var(--shadow-lg)',
            minWidth: 220,
            zIndex: 100,
            animation: 'selector-in 120ms ease-out',
          }}
        >
          {PACKAGES.map((pkg) => {
            const Icon = pkg.icon;
            const isActive = pkg.id === selected;
            return (
              <button
                key={pkg.id}
                onClick={() => {
                  setSelected(pkg.id);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? pkg.bg : 'transparent',
                  color: isActive ? pkg.color : 'var(--text-secondary)',
                  fontSize: 13,
                  fontFamily: 'var(--font-sans)',
                  textAlign: 'left',
                  transition: 'all 120ms ease-out',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: isActive ? `${pkg.color}20` : 'var(--bg-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} color={isActive ? pkg.color : 'var(--text-tertiary)'} />
                </span>
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontWeight: isActive ? 600 : 500 }}>{pkg.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>{pkg.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
