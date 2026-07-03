import React from 'react';
import type { TimelineEngine } from '@timelinx/react';
import { X } from 'lucide-react';
import { PanelId } from './IconBar';
import { MediaPool } from './MediaPool';
import { Inspector } from './Inspector';
import { EffectsPanel } from './EffectsPanel';
import {
  MarkersPanel,
  TransitionsPanel,
  KeyframesPanel,
} from '@timelinx/ui';

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
    <aside className="panel panel--left">
      <div className="panel-header">
        <span className="panel-title">
          {PANEL_TITLES[activePanel]}
        </span>
        <button
          onClick={onClose}
          className="icon-btn"
          title="Close panel"
        >
          <X size={14} />
        </button>
      </div>

      <div className="panel-content">
        {activePanel === 'media'       && <MediaPool engine={engine} />}
        {activePanel === 'inspector'   && <Inspector engine={engine} />}
        {activePanel === 'effects'     && <EffectsPanel />}
        {activePanel === 'markers'     && <MarkersPanel />}
        {activePanel === 'transitions' && <TransitionsPanel />}
        {activePanel === 'keyframes'   && <KeyframesPanel />}
      </div>
    </aside>
  );
}
