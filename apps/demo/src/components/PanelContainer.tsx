import React from 'react';
import type { TimelineEngine } from '@timelinx/react';
import { X } from 'lucide-react';
import { PanelId } from './IconBar';
import { MediaPool } from './MediaPool';
import { Inspector } from './Inspector';
import { EffectsPanel } from './EffectsPanel';
import { MarkersPanel } from './MarkersPanel';
import { TransitionsPanel } from './TransitionsPanel';
import { KeyframesPanel } from './KeyframesPanel';

interface PanelContainerProps {
  activePanel: PanelId;
  engine: TimelineEngine;
  onClose: () => void;
}

const PANEL_TITLES: Record<PanelId, string> = {
  media: 'Media Pool',
  inspector: 'Inspector',
  effects: 'Effects',
  markers: 'Markers',
  transitions: 'Transitions',
  keyframes: 'Keyframes',
};

export function PanelContainer({ activePanel, engine, onClose }: PanelContainerProps) {
  return (
    <div style={{
      width: 280,
      display: 'flex',
      flexDirection: 'column',
      background: '#141418',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      <div style={{
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.8)',
          letterSpacing: '-0.01em',
        }}>
          {PANEL_TITLES[activePanel]}
        </span>
        <button
          onClick={onClose}
          style={{
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.3)',
            cursor: 'pointer',
            borderRadius: 6,
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
          }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
        {activePanel === 'media' && <MediaPool engine={engine} />}
        {activePanel === 'inspector' && <Inspector engine={engine} />}
        {activePanel === 'effects' && <EffectsPanel />}
        {activePanel === 'markers' && <MarkersPanel />}
        {activePanel === 'transitions' && <TransitionsPanel />}
        {activePanel === 'keyframes' && <KeyframesPanel />}
      </div>
    </div>
  );
}
