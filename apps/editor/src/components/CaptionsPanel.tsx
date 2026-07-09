import { useState, useCallback } from 'react';
import { useEngine, useAllTracks, useFps, usePlayheadFrame, useTrackCaptions } from '@timelinx/react';
import { toCaptionId, defaultCaptionStyle } from '@timelinx/core';
import type { CaptionId, TrackId, Caption } from '@timelinx/core';

export function CaptionsPanel() {
  const engine = useEngine();
  const tracks = useAllTracks(engine);
  const fps = useFps(engine);
  const playheadFrame = usePlayheadFrame(engine);

  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string | null>(null);

  const activeTrackId = selectedTrackId ?? (tracks[0]?.id ?? null);
  const captionsFromHook = useTrackCaptions(engine, activeTrackId ?? '');

  const captions: { caption: Caption; trackId: string }[] = [];
  if (activeTrackId) {
    for (const c of captionsFromHook) {
      captions.push({ caption: c, trackId: activeTrackId });
    }
  }

  const selectedCaption = selectedCaptionId
    ? captions.find((c) => c.caption.id === selectedCaptionId)
    : null;

  const handleAddCaption = useCallback(() => {
    if (!activeTrackId) return;
    const duration = fps * 2;
    let startFrame = playheadFrame;
    let endFrame = (startFrame + duration) as import('@timelinx/core').TimelineFrame;

    const overlapping = captionsFromHook.some(
      (c) => startFrame < (c.endFrame as number) && endFrame > (c.startFrame as number),
    );
    if (overlapping && captionsFromHook.length > 0) {
      const lastEnd = Math.max(...captionsFromHook.map((c) => c.endFrame as number));
      startFrame = lastEnd as import('@timelinx/core').TimelineFrame;
      endFrame = (lastEnd + duration) as import('@timelinx/core').TimelineFrame;
    }

    engine.dispatch({
      id: `add-caption-${Date.now()}`,
      label: 'Add caption',
      timestamp: Date.now(),
      operations: [{
        type: 'ADD_CAPTION',
        trackId: activeTrackId as TrackId,
        caption: {
          id: toCaptionId(`cap-${Date.now()}`) as CaptionId,
          text: 'New caption',
          startFrame: startFrame as import('@timelinx/core').TimelineFrame,
          endFrame: endFrame as import('@timelinx/core').TimelineFrame,
          language: 'en-US',
          style: defaultCaptionStyle,
          burnIn: false,
        },
      }],
    });
  }, [engine, activeTrackId, playheadFrame, fps, captionsFromHook]);

  const handleDeleteCaption = useCallback((captionId: string, trackId: string) => {
    engine.dispatch({
      id: `delete-caption-${Date.now()}`,
      label: 'Delete caption',
      timestamp: Date.now(),
      operations: [{
        type: 'DELETE_CAPTION',
        captionId: captionId as CaptionId,
        trackId: trackId as TrackId,
      }],
    });
    if (selectedCaptionId === captionId) setSelectedCaptionId(null);
  }, [engine, selectedCaptionId]);

  const handleSaveText = useCallback(() => {
    if (!selectedCaption || editText === null) return;
    engine.dispatch({
      id: `edit-caption-${Date.now()}`,
      label: 'Edit caption text',
      timestamp: Date.now(),
      operations: [{
        type: 'EDIT_CAPTION',
        captionId: selectedCaption.caption.id as CaptionId,
        trackId: selectedCaption.trackId as TrackId,
        text: editText,
      }],
    });
    setEditText(null);
  }, [engine, selectedCaption, editText]);

  const formatFrame = (frame: number) => {
    const totalSeconds = frame / fps;
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    const ms = Math.floor((totalSeconds % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  return (
    <div className="inspector-panel">
      <div className="panel-header">
        <h3 className="panel-title">Captions</h3>
        <button
          className="panel-action-btn"
          disabled={!activeTrackId}
          onClick={handleAddCaption}
        >
          + Add
        </button>
      </div>
      <div className="panel-content">
        <div className="field-group">
          <label>Track</label>
          <select
            value={activeTrackId ?? ''}
            onChange={(e) => {
              setSelectedTrackId(e.target.value || null);
              setSelectedCaptionId(null);
              setEditText(null);
            }}
          >
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {captions.length === 0 ? (
          <div className="empty-state">
            <p>No captions on this track</p>
            <p className="empty-state-hint">Click "+ Add" at the playhead position</p>
          </div>
        ) : (
          <>
            <ul className="caption-list">
              {captions.map(({ caption, trackId }) => (
                <li
                  key={caption.id}
                  className={`caption-item${selectedCaptionId === caption.id ? ' selected' : ''}`}
                  onClick={() => { setSelectedCaptionId(caption.id); setEditText(caption.text); }}
                >
                  <div className="caption-info">
                    <span className="caption-timecode">
                      {formatFrame(caption.startFrame as number)} → {formatFrame(caption.endFrame as number)}
                    </span>
                    <span className="caption-text">{caption.text}</span>
                  </div>
                  <button
                    className="caption-delete-btn"
                    title="Delete caption"
                    onClick={(e) => { e.stopPropagation(); handleDeleteCaption(caption.id, trackId); }}
                  >
                    x
                  </button>
                </li>
              ))}
            </ul>

            {selectedCaption && (
              <div className="caption-editor">
                <div className="field-group">
                  <label>Text</label>
                  <textarea
                    value={editText ?? selectedCaption.caption.text}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={handleSaveText}
                    rows={3}
                  />
                </div>
                <div className="caption-meta">
                  <span>{selectedCaption.caption.language}</span>
                  <span>{formatFrame(selectedCaption.caption.startFrame as number)} → {formatFrame(selectedCaption.caption.endFrame as number)}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
