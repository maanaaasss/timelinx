import React, { useState, useCallback } from 'react';
import { useEngine, useSelectedClipIds, usePlayheadFrame, useClip } from '@timelinx/react';
import { toKeyframeId, LINEAR_EASING } from '@timelinx/core';
import { useTimelineContext } from '../context/timeline-context';
import { CollapsibleSection } from './collapsible-section';
import type { ClipId, Effect, Keyframe, KeyframeId, EffectId } from '@timelinx/core';

function KeyframesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="12" r="3" />
      <line x1="9" y1="12" x2="15" y2="12" />
    </svg>
  );
}

export interface KeyframesPanelProps {
  className?: string;
}

export const KeyframesPanel = React.memo(function KeyframesPanel({
  className,
}: KeyframesPanelProps) {
  const { engine } = useTimelineContext();
  const selectedClipIds = useSelectedClipIds(engine);
  const playheadFrame = usePlayheadFrame(engine);
  const [selectedEffectIdx, setSelectedEffectIdx] = useState(0);

  const selectedClipId = selectedClipIds.size === 1 ? Array.from(selectedClipIds)[0] : null;
  const clip = useClip(selectedClipId ?? '');

  const effects: readonly Effect[] = clip?.effects ?? [];
  const selectedEffect = effects[selectedEffectIdx] ?? null;
  const keyframes: readonly Keyframe[] = selectedEffect?.keyframes ?? [];

  const handleAddKeyframe = useCallback(() => {
    if (!selectedClipId || !selectedEffect) return;
    const keyframe: Keyframe = {
      id: toKeyframeId(`kf-${Date.now()}`),
      frame: playheadFrame,
      value: 1.0,
      easing: LINEAR_EASING,
    };
    engine.dispatch({
      id: `add-keyframe-${Date.now()}`,
      label: 'Add keyframe',
      timestamp: Date.now(),
      operations: [{
        type: 'ADD_KEYFRAME',
        clipId: selectedClipId as ClipId,
        effectId: selectedEffect.id,
        keyframe,
      }],
    });
  }, [engine, selectedClipId, selectedEffect, playheadFrame]);

  const handleDeleteKeyframe = useCallback((keyframeId: string) => {
    if (!selectedClipId || !selectedEffect) return;
    engine.dispatch({
      id: `delete-keyframe-${Date.now()}`,
      label: 'Delete keyframe',
      timestamp: Date.now(),
      operations: [{
        type: 'DELETE_KEYFRAME',
        clipId: selectedClipId as ClipId,
        effectId: selectedEffect.id,
        keyframeId: keyframeId as KeyframeId,
      }],
    });
  }, [engine, selectedClipId, selectedEffect]);

  if (!selectedClipId) {
    return (
      <div className={`inspector-panel${className ? ` ${className}` : ''}`}>
        <div className="panel-header">
          <h3 className="panel-title">Keyframes</h3>
        </div>
        <div className="panel-content">
          <div className="empty-state">
            <p>Select a clip to view its keyframes</p>
          </div>
        </div>
      </div>
    );
  }

  if (effects.length === 0) {
    return (
      <div className={`inspector-panel${className ? ` ${className}` : ''}`}>
        <div className="panel-header">
          <h3 className="panel-title">Keyframes</h3>
        </div>
        <div className="panel-content">
          <div className="empty-state">
            <p>No effects on this clip</p>
            <p className="empty-state-hint">Add an effect first, then add keyframes to it</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`inspector-panel${className ? ` ${className}` : ''}`}>
      <div className="panel-header">
        <h3 className="panel-title">Keyframes</h3>
        <button
          className="panel-action-btn"
          disabled={!selectedEffect}
          onClick={handleAddKeyframe}
        >
          + Add
        </button>
      </div>
      <div className="panel-content">
        <div className="field-group">
          <label className="field-label">Effect</label>
          <select
            className="field-select"
            value={selectedEffectIdx}
            onChange={(e) => setSelectedEffectIdx(Number(e.target.value))}
          >
            {effects.map((ef, i) => (
              <option key={ef.id} value={i}>{ef.effectType} ({(ef.id as string).slice(0, 8)})</option>
            ))}
          </select>
        </div>

        {keyframes.length === 0 ? (
          <div className="empty-state">
            <p>No keyframes on this effect</p>
            <p className="empty-state-hint">Click "+ Add" at the playhead position</p>
          </div>
        ) : (
          <ul className="keyframe-list">
            {[...keyframes].sort((a, b) => (a.frame as number) - (b.frame as number)).map((kf) => (
              <li key={kf.id as string} className="keyframe-item">
                <div className="keyframe-info">
                  <span className="keyframe-frame">f{String(kf.frame)}</span>
                  <span className="keyframe-value">{kf.value.toFixed(2)}</span>
                  <span className="keyframe-easing">{kf.easing.kind}</span>
                </div>
                <button
                  className="keyframe-delete-btn"
                  title="Delete keyframe"
                  onClick={() => handleDeleteKeyframe(kf.id as string)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});
