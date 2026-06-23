import React from 'react';
import {
  Film,
  Search,
  Sparkles,
  Bookmark,
  Link,
  Diamond,
  type LucideIcon,
} from 'lucide-react';

export type PanelId = 'media' | 'inspector' | 'effects' | 'markers' | 'transitions' | 'keyframes';

interface IconBarProps {
  activePanel: PanelId | null;
  onPanelToggle: (id: PanelId) => void;
}

const PANELS: { id: PanelId; label: string; icon: LucideIcon }[] = [
  { id: 'media', label: 'Media Pool', icon: Film },
  { id: 'inspector', label: 'Inspector', icon: Search },
  { id: 'effects', label: 'Effects', icon: Sparkles },
  { id: 'markers', label: 'Markers', icon: Bookmark },
  { id: 'transitions', label: 'Transitions', icon: Link },
  { id: 'keyframes', label: 'Keyframes', icon: Diamond },
];

export function IconBar({ activePanel, onPanelToggle }: IconBarProps) {
  return (
    <div style={{
      width: 48,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 0',
      gap: 4,
      background: '#141418',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      flexShrink: 0,
    }}>
      {PANELS.map((panel) => {
        const isActive = activePanel === panel.id;
        return (
          <button
            key={panel.id}
            onClick={() => onPanelToggle(panel.id)}
            title={panel.label}
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isActive
                ? 'rgba(99,102,241,0.15)'
                : 'transparent',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              color: isActive
                ? '#818cf8'
                : 'rgba(255,255,255,0.35)',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255,255,255,0.35)';
              }
            }}
          >
            <panel.icon size={18} strokeWidth={1.8} />
          </button>
        );
      })}
    </div>
  );
}
