import React, { useState, useCallback } from 'react';
import { useTrackIdsWithEngine, useTrackWithEngine } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import { frameToTimecode } from '../shared/time';
import type { TrackId, TimelineFrame } from '@timelinx/core';

export interface CaptionsPanelProps {
  className?: string;
}

export const CaptionsPanel = React.memo(function CaptionsPanel({
  className,
}: CaptionsPanelProps) {
  const { engine } = useTimelineContext();
  const trackIds = useTrackIdsWithEngine(engine);
  const [selectedTrackId, setSelectedTrackId] = useState<TrackId | null>(null);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string | null>(null);

  const timeline = engine.getState().timeline;
  const fps = (timeline.fps as number) || 30;

  // Find subtitle tracks
  const subtitleTracks = trackIds.filter((tid) => {
    const track = timeline.tracks.find((t) => (t.id as string) === tid);
    return track?.type === 'subtitle';
  });

  // Get captions from selected track
  const selectedTrack = selectedTrackId
    ? timeline.tracks.find((t) => t.id === selectedTrackId)
    : null;
  const captions = selectedTrack?.captions ?? [];

  const handleTrackChange = useCallback((trackId: TrackId) => {
    setSelectedTrackId(trackId);
    setSelectedCaptionId(null);
    setEditingText(null);
  }, []);

  const handleCaptionClick = useCallback((caption: { id: string; startFrame: TimelineFrame; text: string }) => {
    setSelectedCaptionId(caption.id);
    setEditingText(caption.text);
    // Seek to caption start
    engine.seekTo(caption.startFrame as TimelineFrame);
  }, [engine]);

  const handleTextChange = useCallback((text: string) => {
    setEditingText(text);
  }, []);

  const handleTextBlur = useCallback(() => {
    if (selectedCaptionId && selectedTrackId && editingText !== null) {
      engine.dispatch({
        id: `edit-caption-${Date.now()}`,
        label: 'Edit caption text',
        timestamp: Date.now(),
        operations: [{
          type: 'EDIT_CAPTION',
          captionId: selectedCaptionId as any,
          trackId: selectedTrackId,
          text: editingText,
        }],
      });
    }
  }, [engine, selectedCaptionId, selectedTrackId, editingText]);

  const handleDeleteCaption = useCallback((captionId: string, trackId: TrackId) => {
    engine.dispatch({
      id: `delete-caption-${Date.now()}`,
      label: 'Delete caption',
      timestamp: Date.now(),
      operations: [{ type: 'DELETE_CAPTION', captionId: captionId as any, trackId }],
    });
    setSelectedCaptionId(null);
    setEditingText(null);
  }, [engine]);

  const formatCaptionRange = (caption: { startFrame: TimelineFrame; endFrame: TimelineFrame }): string => {
    return `${frameToTimecode(caption.startFrame as number, fps)} → ${frameToTimecode(caption.endFrame as number, fps)}`;
  };

  return (
    <div className={`captions-panel${className ? ` ${className}` : ''}`}>
      <div className="panel-header">
        <h3 className="panel-title">Captions</h3>
      </div>

      <div className="panel-content">
        {subtitleTracks.length === 0 ? (
          <div className="empty-state">
            <p>No subtitle tracks</p>
            <p className="empty-state-hint">Add a subtitle track to see captions</p>
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
                {subtitleTracks.map((tid) => {
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
                {captions.length === 0 ? (
                  <div className="empty-state">
                    <p>No captions on this track</p>
                  </div>
                ) : (
                  <ul className="caption-list">
                    {captions.map((caption) => (
                      <li
                        key={caption.id as string}
                        className={`caption-item${selectedCaptionId === caption.id ? ' selected' : ''}`}
                        onClick={() => handleCaptionClick(caption)}
                      >
                        <div className="caption-info">
                          <span className="caption-timecode">{formatCaptionRange(caption)}</span>
                          <span className="caption-text">{caption.text}</span>
                        </div>
                        <button
                          className="caption-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCaption(caption.id as string, selectedTrackId);
                          }}
                          title="Delete caption"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {selectedCaptionId && editingText !== null && (
                  <div className="caption-editor">
                    <label className="field-label">Text:</label>
                    <textarea
                      className="caption-textarea"
                      value={editingText}
                      onChange={(e) => handleTextChange(e.target.value)}
                      onBlur={handleTextBlur}
                      rows={3}
                    />
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
