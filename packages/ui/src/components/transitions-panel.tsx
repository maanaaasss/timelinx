import React, { useState, useCallback } from 'react';
import { useTrackIdsWithEngine, useClipWithEngine } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import type { TrackId, ClipId } from '@timelinx/core';

export interface TransitionsPanelProps {
  className?: string;
}

export const TransitionsPanel = React.memo(function TransitionsPanel({
  className,
}: TransitionsPanelProps) {
  const { engine } = useTimelineContext();
  const trackIds = useTrackIdsWithEngine(engine);
  const [selectedTrackId, setSelectedTrackId] = useState<TrackId | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<ClipId | null>(null);

  const timeline = engine.getState().timeline;

  // Get clips from selected track
  const selectedTrack = selectedTrackId
    ? timeline.tracks.find((t) => t.id === selectedTrackId)
    : null;
  const clips = selectedTrack?.clips ?? [];

  // Filter clips with transitions
  const clipsWithTransitions = clips.filter((clip) => clip.transition);

  const handleTrackChange = useCallback((trackId: TrackId) => {
    setSelectedTrackId(trackId);
    setSelectedClipId(null);
  }, []);

  const handleClipChange = useCallback((clipId: ClipId) => {
    setSelectedClipId(clipId);
  }, []);

  const handleDeleteTransition = useCallback((clipId: ClipId, trackId: TrackId) => {
    engine.dispatch({
      id: `delete-transition-${Date.now()}`,
      label: 'Delete transition',
      timestamp: Date.now(),
      operations: [{ type: 'DELETE_TRANSITION', clipId }],
    });
    setSelectedClipId(null);
  }, [engine]);

  const handleDurationChange = useCallback((clipId: ClipId, duration: number) => {
    engine.dispatch({
      id: `set-transition-duration-${Date.now()}`,
      label: 'Set transition duration',
      timestamp: Date.now(),
      operations: [{ type: 'SET_TRANSITION_DURATION', clipId, durationFrames: duration }],
    });
  }, [engine]);

  const handleAlignmentChange = useCallback((clipId: ClipId, alignment: 'centerOnCut' | 'endAtCut' | 'startAtCut') => {
    engine.dispatch({
      id: `set-transition-alignment-${Date.now()}`,
      label: 'Set transition alignment',
      timestamp: Date.now(),
      operations: [{ type: 'SET_TRANSITION_ALIGNMENT', clipId, alignment }],
    });
  }, [engine]);

  return (
    <div className={`transitions-panel${className ? ` ${className}` : ''}`}>
      <div className="panel-header">
        <h3 className="panel-title">Transitions</h3>
      </div>

      <div className="panel-content">
        {trackIds.length === 0 ? (
          <div className="empty-state">
            <p>No tracks</p>
            <p className="empty-state-hint">Add a track to see transitions</p>
          </div>
        ) : (
          <>
            <div className="track-selector">
              <label className="field-label">Track:</label>
              <select
                className="track-select"
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
              <>
                {clipsWithTransitions.length === 0 ? (
                  <div className="empty-state">
                    <p>No transitions on this track</p>
                    <p className="empty-state-hint">Use the Transition tool (T) to add transitions</p>
                  </div>
                ) : (
                  <ul className="transition-list">
                    {clipsWithTransitions.map((clip) => {
                      const transition = clip.transition!;
                      return (
                        <li
                          key={clip.id as string}
                          className={`transition-item${selectedClipId === clip.id ? ' selected' : ''}`}
                          onClick={() => handleClipChange(clip.id)}
                        >
                          <div className="transition-info">
                            <span className="transition-type">{transition.type}</span>
                            <span className="transition-duration">{transition.durationFrames} frames</span>
                            <span className="transition-alignment">{transition.alignment}</span>
                          </div>
                          <button
                            className="transition-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTransition(clip.id, selectedTrackId);
                            }}
                            title="Delete transition"
                          >
                            ×
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {selectedClipId && (
                  <div className="transition-editor">
                    {(() => {
                      const clip = clips.find((c) => c.id === selectedClipId);
                      const transition = clip?.transition;
                      if (!transition) return null;

                      return (
                        <>
                          <div className="field-group">
                            <label className="field-label">Duration (frames):</label>
                            <input
                              type="number"
                              className="field-input"
                              value={transition.durationFrames}
                              min={1}
                              onChange={(e) => handleDurationChange(selectedClipId, parseInt(e.target.value, 10) || 1)}
                            />
                          </div>

                          <div className="field-group">
                            <label className="field-label">Alignment:</label>
                            <select
                              className="field-select"
                              value={transition.alignment}
                              onChange={(e) => handleAlignmentChange(
                                selectedClipId,
                                e.target.value as 'centerOnCut' | 'endAtCut' | 'startAtCut'
                              )}
                            >
                              <option value="centerOnCut">Center on cut</option>
                              <option value="endAtCut">End at cut</option>
                              <option value="startAtCut">Start at cut</option>
                            </select>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
});
