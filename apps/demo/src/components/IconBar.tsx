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
    <div className="sidebar">
      {PANELS.map((panel) => {
        const isActive = activePanel === panel.id;
        return (
          <button
            key={panel.id}
            onClick={() => onPanelToggle(panel.id)}
            title={panel.label}
            className={`sidebar-btn${isActive ? ' active' : ''}`}
            aria-label={panel.label}
          >
            <panel.icon size={18} strokeWidth={1.8} />
          </button>
        );
      })}
    </div>
  );
}
