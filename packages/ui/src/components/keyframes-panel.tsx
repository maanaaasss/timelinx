import React, { useState, useCallback } from 'react';
import { useTrackIdsWithEngine, useClipWithEngine } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import { frameToTimecode } from '../shared/time';
import type { Keyframe, KeyframeId, ClipId, TrackId, EffectId, TimelineFrame } from '@timelinx/core';

export interface KeyframesPanelProps {
  className?: string;
}

export const KeyframesPanel = React.memo(function KeyframesPanel({
  className,
}: KeyframesPanelProps) {
  const { engine } = useTimelineContext();
  const trackIds = useTrackIdsWithEngine(engine);
  const [selectedTrackId, setSelectedTrackId] = useState<TrackId | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<ClipId | null>(null);
  const [selectedEffectId, setSelectedEffectId] = useState<EffectId | null>(null);

  const timeline = engine.getState().timeline;
  const fps = (timeline.fps as number) || 30;

  // Get clips from selected track
  const selectedTrack = selectedTrackId
    ? timeline.tracks.find((t) => t.id === selectedTrackId)
    : null;
  const clips = selectedTrack?.clips ?? [];

  // Get effects from selected clip
  const selectedClip = selectedClipId
    ? clips.find((c) => c.id === selectedClipId)
    : null;
  const effects = selectedClip?.effects ?? [];

  // Get keyframes from selected effect
  const selectedEffect = selectedEffectId
    ? effects.find((e) => e.id === selectedEffectId)
    : null;
  const keyframes = selectedEffect?.keyframes ?? [];

  const handleTrackChange = useCallback((trackId: TrackId) => {
    setSelectedTrackId(trackId);
    setSelectedClipId(null);
    setSelectedEffectId(null);
  }, []);

  const handleClipChange = useCallback((clipId: ClipId) => {
    setSelectedClipId(clipId);
    setSelectedEffectId(null);
  }, []);

  const handleEffectChange = useCallback((effectId: EffectId) => {
    setSelectedEffectId(effectId);
  }, []);

  const handleDeleteKeyframe = useCallback((keyframeId: KeyframeId, clipId: ClipId, effectId: EffectId) => {
    engine.dispatch({
      id: `delete-keyframe-${Date.now()}`,
      label: 'Delete keyframe',
      timestamp: Date.now(),
      operations: [{ type: 'DELETE_KEYFRAME', clipId, effectId, keyframeId }],
    });
  }, [engine]);

  const formatEasing = (easing: { kind: string }): string => {
    return easing.kind;
  };

  return (
    <div className={`keyframes-panel${className ? ` ${className}` : ''}`}>
      <div className="panel-header">
        <h3 className="panel-title">Keyframes</h3>
      </div>

      <div className="panel-content">
        {trackIds.length === 0 ? (
          <div className="empty-state">
            <p>No tracks</p>
            <p className="empty-state-hint">Add a track to see keyframes</p>
          </div>
        ) : (
          <>
            <div className="field-group">
              <label className="field-label">Track:</label>
              <select
                className="field-select"
                value={selectedTrackId ?? ''}
                onChange={(e) => handleTrackChange(e.target.value as TrackId)}
              >
                <option value="">Select track...</option>
                {trackIds.map((tid) => {
                  const track = timeline.tracks.find((t) => t.id === tid);
                  return (
                    <option key={tid} value={tid}>
                      {track?.name ?? tid}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedTrackId && (
              <div className="field-group">
                <label className="field-label">Clip:</label>
                <select
                  className="field-select"
                  value={selectedClipId ?? ''}
                  onChange={(e) => handleClipChange(e.target.value as ClipId)}
                >
                  <option value="">Select clip...</option>
                  {clips.map((clip) => (
                    <option key={clip.id as string} value={clip.id as string}>
                      {clip.name ?? (clip.id as string).slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedClipId && (
              <div className="field-group">
                <label className="field-label">Effect:</label>
                <select
                  className="field-select"
                  value={selectedEffectId ?? ''}
                  onChange={(e) => handleEffectChange(e.target.value as EffectId)}
                >
                  <option value="">Select effect...</option>
                  {effects.map((effect) => (
                    <option key={effect.id as string} value={effect.id as string}>
                      {effect.id as string}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedEffectId && (
              <>
                {keyframes.length === 0 ? (
                  <div className="empty-state">
                    <p>No keyframes on this effect</p>
                    <p className="empty-state-hint">Use the Keyframe tool (K) to add keyframes</p>
                  </div>
                ) : (
                  <ul className="keyframe-list">
                    {keyframes.map((keyframe) => (
                      <li key={keyframe.id as string} className="keyframe-item">
                        <div className="keyframe-info">
                          <span className="keyframe-frame">{frameToTimecode(keyframe.frame as number, fps)}</span>
                          <span className="keyframe-value">{keyframe.value.toFixed(2)}</span>
                          <span className="keyframe-easing">{formatEasing(keyframe.easing)}</span>
                        </div>
                        <button
                          className="keyframe-delete-btn"
                          onClick={() => handleDeleteKeyframe(keyframe.id, selectedClipId!, selectedEffectId!)}
                          title="Delete keyframe"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
});
