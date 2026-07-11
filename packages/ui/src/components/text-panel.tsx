import React, { useState, useCallback } from 'react';
import { useAllTracks, usePlayheadFrame, useSelectedClipIds } from '@timelinx/react';
import { toGeneratorId, toFrame } from '@timelinx/core';
import { useTimelineContext } from '../context/timeline-context';
import type { TrackId, Generator } from '@timelinx/core';

export interface TextPanelProps {
  className?: string;
}

export const TextPanel = React.memo(function TextPanel({
  className,
}: TextPanelProps) {
  const { engine } = useTimelineContext();
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
    <div className={`inspector-panel${className ? ` ${className}` : ''}`}>
      <div className="panel-header">
        <h3 className="panel-title">Text Clips</h3>
      </div>
      <div className="panel-content">
        <div className="field-group">
          <label className="field-label">Track</label>
          <select
            className="field-select"
            value={activeTrackId ?? ''}
            onChange={(e) => setSelectedTrackId(e.target.value || null)}
          >
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label className="field-label">Text</label>
          <textarea
            className="field-textarea"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder="Enter title text..."
            rows={3}
          />
        </div>

        <button
          className="text-panel-btn"
          disabled={!activeTrackId}
          onClick={handleAddTextClip}
        >
          + Add Text Clip
        </button>

        {selectedClipId && (
          <div className="field-group" style={{ marginTop: 'var(--space-3)' }}>
            <label className="field-label">Selected Clip</label>
            <span className="clip-name">{selectedClipId}</span>
          </div>
        )}

        <div className="empty-state" style={{ marginTop: 'var(--space-3)' }}>
          <p className="empty-state-hint">
            Text clips appear as regular clips on the timeline.
            Select, drag, trim, split, and delete them like any other clip.
          </p>
        </div>
      </div>
    </div>
  );
});
