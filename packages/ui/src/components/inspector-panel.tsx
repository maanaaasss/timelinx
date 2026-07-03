import React, { useState, useCallback, useEffect } from 'react';
import { useSelectedClipIds, useTrackWithEngine, useClipWithEngine } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import type { ClipId, TrackId } from '@timelinx/core';

export interface InspectorPanelProps {
  className?: string;
}

export const InspectorPanel = React.memo(function InspectorPanel({
  className,
}: InspectorPanelProps) {
  const { engine } = useTimelineContext();
  const selectedClipIds = useSelectedClipIds(engine);
  const [activeTab, setActiveTab] = useState<'transform' | 'audio' | 'effects'>('transform');

  const selectedClips = Array.from(selectedClipIds);
  const hasSelection = selectedClips.length > 0;
  const singleSelection = selectedClips.length === 1 ? selectedClips[0] : null;

  // Find the clip and track for single selection
  const [clipTrackMap, setClipTrackMap] = useState<Map<ClipId, TrackId>>(new Map());

  useEffect(() => {
    if (!singleSelection) {
      setClipTrackMap(new Map());
      return;
    }

    const state = engine.getState();
    const map = new Map<ClipId, TrackId>();
    for (const track of state.timeline.tracks) {
      for (const clip of track.clips) {
        if (clip.id === singleSelection) {
          map.set(clip.id as ClipId, track.id as TrackId);
        }
      }
    }
    setClipTrackMap(map);
  }, [engine, singleSelection]);

  const trackId = singleSelection ? clipTrackMap.get(singleSelection as ClipId) : null;
  const track = trackId ? engine.getState().timeline.tracks.find((t) => t.id === trackId) : null;
  const clip = track?.clips.find((c) => c.id === singleSelection);

  if (!hasSelection) {
    return (
      <div className={`inspector-panel${className ? ` ${className}` : ''}`}>
        <div className="panel-header">
          <h3 className="panel-title">Inspector</h3>
        </div>
        <div className="panel-content">
          <div className="empty-state">
            <p>No clip selected</p>
            <p className="empty-state-hint">Select a clip to inspect its properties</p>
          </div>
        </div>
      </div>
    );
  }

  if (selectedClips.length > 1) {
    return (
      <div className={`inspector-panel${className ? ` ${className}` : ''}`}>
        <div className="panel-header">
          <h3 className="panel-title">Inspector</h3>
        </div>
        <div className="panel-content">
          <div className="empty-state">
            <p>{selectedClips.length} clips selected</p>
            <p className="empty-state-hint">Select a single clip to inspect properties</p>
          </div>
        </div>
      </div>
    );
  }

  const transform = clip?.transform ?? {
    positionX: { value: 0, keyframes: [] },
    positionY: { value: 0, keyframes: [] },
    scaleX: { value: 1, keyframes: [] },
    scaleY: { value: 1, keyframes: [] },
    rotation: { value: 0, keyframes: [] },
    anchorX: { value: 0, keyframes: [] },
    anchorY: { value: 0, keyframes: [] },
    opacity: { value: 1, keyframes: [] },
  };

  return (
    <div className={`inspector-panel${className ? ` ${className}` : ''}`}>
      <div className="panel-header">
        <h3 className="panel-title">Inspector</h3>
      </div>

      <div className="panel-tabs">
        <button
          className={`panel-tab${activeTab === 'transform' ? ' active' : ''}`}
          onClick={() => setActiveTab('transform')}
        >
          Transform
        </button>
        <button
          className={`panel-tab${activeTab === 'audio' ? ' active' : ''}`}
          onClick={() => setActiveTab('audio')}
        >
          Audio
        </button>
        <button
          className={`panel-tab${activeTab === 'effects' ? ' active' : ''}`}
          onClick={() => setActiveTab('effects')}
        >
          Effects
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'transform' && (
          <div className="inspector-section">
            <div className="field-group">
              <label className="field-label">Position X:</label>
              <input
                type="number"
                className="field-input"
                value={transform.positionX.value}
                onChange={(e) => {
                  // Transform editing would need to be implemented with proper operations
                  console.log('Set positionX:', e.target.value);
                }}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Position Y:</label>
              <input
                type="number"
                className="field-input"
                value={transform.positionY.value}
                onChange={(e) => {
                  console.log('Set positionY:', e.target.value);
                }}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Scale X:</label>
              <input
                type="number"
                className="field-input"
                value={transform.scaleX.value}
                step={0.1}
                onChange={(e) => {
                  console.log('Set scaleX:', e.target.value);
                }}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Scale Y:</label>
              <input
                type="number"
                className="field-input"
                value={transform.scaleY.value}
                step={0.1}
                onChange={(e) => {
                  console.log('Set scaleY:', e.target.value);
                }}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Rotation:</label>
              <input
                type="number"
                className="field-input"
                value={transform.rotation.value}
                onChange={(e) => {
                  console.log('Set rotation:', e.target.value);
                }}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Opacity:</label>
              <input
                type="number"
                className="field-input"
                value={transform.opacity.value}
                min={0}
                max={1}
                step={0.1}
                onChange={(e) => {
                  console.log('Set opacity:', e.target.value);
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="inspector-section">
            <div className="empty-state">
              <p>Audio properties</p>
              <p className="empty-state-hint">Audio editing coming soon</p>
            </div>
          </div>
        )}

        {activeTab === 'effects' && (
          <div className="inspector-section">
            {clip?.effects && clip.effects.length > 0 ? (
              <ul className="effects-list">
                {clip.effects.map((effect) => (
                  <li key={effect.id as string} className="effect-item">
                    <span className="effect-name">{effect.id as string}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p>No effects</p>
                <p className="empty-state-hint">Add effects to this clip</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
