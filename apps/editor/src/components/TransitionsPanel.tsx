import { useState, useCallback } from 'react';
import { useEngine, useAllTracks, useAllTransitions } from '@timelinx/react';
import type { ClipId } from '@timelinx/core';

export function TransitionsPanel() {
  const engine = useEngine();
  const tracks = useAllTracks(engine);
  const allTransitions = useAllTransitions(engine);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  const clipsWithTransitions = selectedTrackId
    ? allTransitions.filter((t) => t.trackId === selectedTrackId)
    : allTransitions;

  const selectedClip = selectedClipId
    ? clipsWithTransitions.find((c) => c.clipId === selectedClipId)
    : null;

  const handleDeleteTransition = useCallback((clipId: string) => {
    engine.dispatch({
      id: `delete-transition-${Date.now()}`,
      label: 'Delete transition',
      timestamp: Date.now(),
      operations: [{ type: 'DELETE_TRANSITION', clipId: clipId as ClipId }],
    });
    if (selectedClipId === clipId) setSelectedClipId(null);
  }, [engine, selectedClipId]);

  const handleSetDuration = useCallback((clipId: string, duration: number) => {
    engine.dispatch({
      id: `set-transition-duration-${Date.now()}`,
      label: 'Set transition duration',
      timestamp: Date.now(),
      operations: [{ type: 'SET_TRANSITION_DURATION', clipId: clipId as ClipId, durationFrames: Math.max(1, duration) }],
    });
  }, [engine]);

  const handleSetAlignment = useCallback((clipId: string, alignment: string) => {
    engine.dispatch({
      id: `set-transition-alignment-${Date.now()}`,
      label: 'Set transition alignment',
      timestamp: Date.now(),
      operations: [{ type: 'SET_TRANSITION_ALIGNMENT', clipId: clipId as ClipId, alignment: alignment as import('@timelinx/core').TransitionAlignment }],
    });
  }, [engine]);

  return (
    <div className="inspector-panel">
      <div className="panel-header">
        <h3 className="panel-title">Transitions</h3>
      </div>
      <div className="panel-content">
        <div className="field-group">
          <label>Track</label>
          <select
            value={selectedTrackId ?? ''}
            onChange={(e) => {
              setSelectedTrackId(e.target.value || null);
              setSelectedClipId(null);
            }}
          >
            <option value="">All tracks</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {clipsWithTransitions.length === 0 ? (
          <div className="empty-state">
            <p>No transitions found</p>
            <p className="empty-state-hint">Use the Transition tool (G) and drag from a clip edge</p>
          </div>
        ) : (
          <>
            <ul className="transition-list">
              {clipsWithTransitions.map(({ clipId, transition }) => (
                <li
                  key={clipId}
                  className={`transition-item${selectedClipId === clipId ? ' selected' : ''}`}
                  onClick={() => setSelectedClipId(clipId)}
                >
                  <div className="transition-info">
                    <span className="transition-type">{transition.type}</span>
                    <span className="transition-duration">{transition.durationFrames}fr</span>
                  </div>
                  <button
                    className="transition-delete-btn"
                    title="Remove transition"
                    onClick={(e) => { e.stopPropagation(); handleDeleteTransition(clipId); }}
                  >
                    x
                  </button>
                </li>
              ))}
            </ul>

            {selectedClip && (
              <div className="transition-editor">
                <div className="field-group">
                  <label>Duration (frames)</label>
                  <input
                    type="number"
                    min={1}
                    value={selectedClip.transition.durationFrames}
                    onChange={(e) => handleSetDuration(selectedClip.clipId, Number(e.target.value))}
                  />
                </div>
                <div className="field-group">
                  <label>Alignment</label>
                  <select
                    value={selectedClip.transition.alignment}
                    onChange={(e) => handleSetAlignment(selectedClip.clipId, e.target.value)}
                  >
                    <option value="centerOnCut">Center on Cut</option>
                    <option value="endAtCut">End at Cut</option>
                    <option value="startAtCut">Start at Cut</option>
                  </select>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
