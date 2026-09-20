/**
 * DEPRECATED — Not used by the editor as of the text-clip pivot.
 *
 * Captions are now represented as ordinary Clips via INSERT_GENERATOR
 * with generator type 'text', inheriting all proven clip interactions
 * (select/drag/trim/split) from SelectionTool without custom code.
 *
 * This component is retained for reference; core's ADD/EDIT/DELETE_CAPTION
 * operations and Caption type remain validated and available for
 * future subtitle import/export (a different feature from live editing).
 */

import React, { useState, useCallback } from 'react';
import { useAllTracks, useFps, usePlayheadFrame } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import type { TrackId, Generator } from '@timelinx/core';
import { toFrame, toGeneratorId } from '@timelinx/core';

export type CaptionStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  hAlign: 'left' | 'center' | 'right';
  vAlign: 'top' | 'middle' | 'bottom';
};

export type Caption = {
  id: string;
  text: string;
  startFrame: number;
  endFrame: number;
  language: string;
  style: CaptionStyle;
  burnIn: boolean;
};

export type CaptionId = string;

export const defaultCaptionStyle: CaptionStyle = {
  fontFamily: 'sans-serif',
  fontSize: 16,
  color: '#ffffff',
  backgroundColor: 'rgba(0,0,0,0.8)',
  hAlign: 'center',
  vAlign: 'bottom',
};

export interface CaptionsPanelProps {
  className?: string;
}

/** @deprecated Use TextPanel with INSERT_GENERATOR instead. */
export const CaptionsPanel = React.memo(function CaptionsPanel({ className }: CaptionsPanelProps) {
  const { engine } = useTimelineContext();
  const tracks = useAllTracks(engine);
  const fps = useFps(engine);
  const playheadFrame = usePlayheadFrame(engine);

  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string | null>(null);

  const activeTrackId = selectedTrackId ?? tracks[0]?.id ?? null;
  const activeTrack = tracks.find((t) => t.id === activeTrackId);
  const textClips =
    activeTrack?.clips.filter(
      (c) => (c.metadata as any)?.type === 'text' || c.name?.startsWith('Caption'),
    ) ?? [];

  const captions: { caption: Caption; trackId: string }[] = textClips.map((c) => ({
    trackId: activeTrackId ?? '',
    caption: {
      id: c.id,
      text: c.name || 'Caption',
      startFrame: c.timelineStart as number,
      endFrame: c.timelineEnd as number,
      language: 'en-US',
      style: defaultCaptionStyle,
      burnIn: false,
    },
  }));

  const selectedCaption = selectedCaptionId
    ? captions.find((c) => c.caption.id === selectedCaptionId)
    : null;

  const handleAddCaption = useCallback(() => {
    if (!activeTrackId) return;
    const duration = Math.round(fps * 2);
    const generator: Generator = {
      id: toGeneratorId(`gen-caption-${Date.now()}`),
      type: 'text',
      params: { text: 'New caption' },
      duration: toFrame(duration),
      name: 'New caption',
    };

    engine.dispatch({
      id: `add-caption-${Date.now()}`,
      label: 'Add caption',
      timestamp: Date.now(),
      operations: [
        {
          type: 'INSERT_GENERATOR',
          generator,
          trackId: activeTrackId as TrackId,
          atFrame: toFrame(playheadFrame),
        },
      ],
    });
  }, [engine, activeTrackId, playheadFrame, fps]);

  const handleDeleteCaption = useCallback(
    (captionId: string) => {
      engine.dispatch({
        id: `delete-caption-${Date.now()}`,
        label: 'Delete caption',
        timestamp: Date.now(),
        operations: [
          {
            type: 'DELETE_CLIP',
            clipId: captionId as any,
          },
        ],
      });
      if (selectedCaptionId === captionId) setSelectedCaptionId(null);
    },
    [engine, selectedCaptionId],
  );

  const handleSaveText = useCallback(() => {
    if (!selectedCaption || editText === null) return;
    engine.dispatch({
      id: `edit-caption-${Date.now()}`,
      label: 'Edit caption text',
      timestamp: Date.now(),
      operations: [
        {
          type: 'SET_CLIP_METADATA',
          clipId: selectedCaption.caption.id as any,
          metadata: { text: editText },
        },
      ],
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
    <div className={`inspector-panel${className ? ` ${className}` : ''}`}>
      <div className="panel-header">
        <h3 className="panel-title">Captions</h3>
        <button className="panel-action-btn" disabled={!activeTrackId} onClick={handleAddCaption}>
          + Add
        </button>
      </div>
      <div className="panel-content">
        <div className="deprecated-notice">
          <strong>Deprecated:</strong> Use TextPanel with INSERT_GENERATOR instead. Captions are now
          ordinary Clips via the text-clip pivot.
        </div>

        <div className="field-group">
          <label className="field-label">Track</label>
          <select
            className="field-select"
            value={activeTrackId ?? ''}
            onChange={(e) => {
              setSelectedTrackId(e.target.value || null);
              setSelectedCaptionId(null);
              setEditText(null);
            }}
          >
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
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
                  onClick={() => {
                    setSelectedCaptionId(caption.id);
                    setEditText(caption.text);
                  }}
                >
                  <div className="caption-info">
                    <span className="caption-timecode">
                      {formatFrame(caption.startFrame as number)} →{' '}
                      {formatFrame(caption.endFrame as number)}
                    </span>
                    <span className="caption-text">{caption.text}</span>
                  </div>
                  <button
                    className="caption-delete-btn"
                    title="Delete caption"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCaption(caption.id);
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>

            {selectedCaption && (
              <div className="caption-editor">
                <div className="field-group">
                  <label className="field-label">Text</label>
                  <textarea
                    className="field-textarea"
                    value={editText ?? selectedCaption.caption.text}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={handleSaveText}
                    rows={3}
                  />
                </div>
                <div className="caption-meta">
                  <span>{selectedCaption.caption.language}</span>
                  <span>
                    {formatFrame(selectedCaption.caption.startFrame as number)} →{' '}
                    {formatFrame(selectedCaption.caption.endFrame as number)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});
