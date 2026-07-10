import { useState, useCallback } from 'react';
import { useEngine, useAllTracks, usePlayheadFrame, useSelectedClipIds } from '@timelinx/react';
import { toGeneratorId, toFrame } from '@timelinx/core';
import type { TrackId, Generator } from '@timelinx/core';

export function TextPanel() {
  const engine = useEngine();
  const tracks = useAllTracks(engine);
  const playheadFrame = usePlayheadFrame(engine);
  const selectedClipIds = useSelectedClipIds(engine);

  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [textValue, setTextValue] = useState('');

  const activeTrackId = selectedTrackId ?? (tracks[0]?.id ?? null);

  const handleAddTextClip = useCallback(() => {
    if (!activeTrackId) return;
    const text = textValue.trim() || 'New Title';
    const duration = 90;
    const generator: Generator = {
      id: toGeneratorId(`gen-text-${Date.now()}`),
      type: 'text',
      params: { text },
      duration: toFrame(duration),
      name: text,
    };

    engine.dispatch({
      id: `add-text-${Date.now()}`,
      label: 'Add text clip',
      timestamp: Date.now(),
      operations: [{
        type: 'INSERT_GENERATOR',
        generator,
        trackId: activeTrackId as TrackId,
        atFrame: toFrame(playheadFrame),
      }],
    });

    setTextValue('');
  }, [engine, activeTrackId, playheadFrame, textValue]);

  const selectedClipId = [...selectedClipIds][0] ?? null;

  return (
    <div className="inspector-panel">
      <div className="panel-header">
        <h3 className="panel-title">Text Clips</h3>
      </div>
      <div className="panel-content">
        <div className="field-group">
          <label>Track</label>
          <select
            value={activeTrackId ?? ''}
            onChange={(e) => setSelectedTrackId(e.target.value || null)}
          >
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label>Text</label>
          <textarea
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder="Enter title text..."
            rows={3}
          />
        </div>

        <button
          className="panel-action-btn"
          disabled={!activeTrackId}
          onClick={handleAddTextClip}
        >
          + Add Text Clip
        </button>

        {selectedClipId && (
          <div className="field-group" style={{ marginTop: 12 }}>
            <label>Selected Clip</label>
            <span className="caption-text">{selectedClipId}</span>
          </div>
        )}

        <div className="empty-state" style={{ marginTop: 12 }}>
          <p className="empty-state-hint">
            Text clips appear as regular clips on the timeline.
            Select, drag, trim, split, and delete them like any other clip.
          </p>
        </div>
      </div>
    </div>
  );
}
