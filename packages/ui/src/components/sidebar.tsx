import React, { useState, useCallback } from 'react';
import {
  Upload,
  Film,
  Image,
  Music,
  Type,
  Repeat,
  Sparkles,
  Smile,
  Sliders,
  Settings,
} from 'lucide-react';

export interface SidebarProps {
  activePanel?: string;
  onPanelChange?: (panel: string) => void;
  className?: string;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'media', label: 'Media', icon: Upload },
  { id: 'video', label: 'Video', icon: Film },
  { id: 'photo', label: 'Photo', icon: Image },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'transitions', label: 'Transitions', icon: Repeat },
  { id: 'effect', label: 'Effect', icon: Sparkles },
  { id: 'sticker', label: 'Sticker', icon: Smile },
  { id: 'adjustment', label: 'Adjustment', icon: Sliders },
];

export const Sidebar = React.memo(function Sidebar({
  activePanel = 'media',
  onPanelChange,
  className,
}: SidebarProps) {
  const [active, setActive] = useState(activePanel);

  const handleClick = useCallback(
    (id: string) => {
      setActive(id);
      onPanelChange?.(id);
    },
    [onPanelChange],
  );

  return (
    <aside className={`sidebar${className ? ` ${className}` : ''}`}>
      {SIDEBAR_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            className={`sidebar-btn${isActive ? ' active' : ''}`}
            title={item.label}
            onClick={() => handleClick(item.id)}
          >
            <span className="sidebar-btn-icon">
              <Icon size={20} />
            </span>
            <span className="sidebar-btn-label">{item.label}</span>
          </button>
        );
      })}
      <div className="sidebar-spacer" />
      <button className="sidebar-btn" title="Settings">
        <span className="sidebar-btn-icon">
          <Settings size={20} />
        </span>
        <span className="sidebar-btn-label">Settings</span>
      </button>
    </aside>
  );
});
