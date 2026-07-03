import React, { useState, useCallback } from 'react';
import { useEngine } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import { frameToTimecode } from '../shared/time';
import type { TimelineFrame, OperationPrimitive, MarkerId } from '@timelinx/core';
import { toMarkerId } from '@timelinx/core';

export interface MarkersPanelProps {
  className?: string;
}

interface Marker {
  id: string;
  type: 'point' | 'range';
  frame?: TimelineFrame;
  frameStart?: TimelineFrame;
  frameEnd?: TimelineFrame;
  label: string;
  color: string;
}

export const MarkersPanel = React.memo(function MarkersPanel({
  className,
}: MarkersPanelProps) {
  const { engine } = useTimelineContext();
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const timeline = engine.getState().timeline;
  const markers = (timeline.markers ?? []) as unknown as Marker[];
  const fps = (timeline.fps as number) || 30;

  const handleMarkerClick = useCallback((marker: Marker) => {
    setSelectedMarkerId(marker.id);
    // Seek to marker position
    const frame = marker.type === 'point' ? marker.frame : marker.frameStart;
    engine.seekTo((frame as number) as TimelineFrame);
  }, [engine]);

  const handleDeleteMarker = useCallback((markerId: string) => {
    engine.dispatch({
      id: `delete-marker-${Date.now()}`,
      label: 'Delete marker',
      timestamp: Date.now(),
      operations: [{ type: 'DELETE_MARKER', markerId: markerId as MarkerId }],
    });
  }, [engine]);

  const handleAddMarker = useCallback(() => {
    const currentFrame = engine.getSnapshot().playhead.currentFrame;
    const marker = {
      type: 'point' as const,
      id: toMarkerId(`marker-${Date.now()}`),
      frame: currentFrame as TimelineFrame,
      label: `Marker ${markers.length + 1}`,
      color: '#FFD166',
      scope: 'global' as const,
      linkedClipId: null,
    };

    engine.dispatch({
      id: `add-marker-${Date.now()}`,
      label: 'Add marker',
      timestamp: Date.now(),
      operations: [{ type: 'ADD_MARKER', marker }],
    });
  }, [engine, markers.length]);

  const formatMarkerPosition = (marker: Marker): string => {
    if (marker.type === 'point') {
      return frameToTimecode(marker.frame as number, fps);
    }
    return `${frameToTimecode(marker.frameStart as number, fps)} → ${frameToTimecode(marker.frameEnd as number, fps)}`;
  };

  return (
    <div className={`markers-panel${className ? ` ${className}` : ''}`}>
      <div className="panel-header">
        <h3 className="panel-title">Markers</h3>
        <button className="panel-action-btn" onClick={handleAddMarker} title="Add marker">
          +
        </button>
      </div>

      <div className="panel-content">
        {markers.length === 0 ? (
          <div className="empty-state">
            <p>No markers yet</p>
            <p className="empty-state-hint">Click + to add a marker at the current playhead position</p>
          </div>
        ) : (
          <ul className="marker-list">
            {markers.map((marker) => (
              <li
                key={marker.id}
                className={`marker-item${selectedMarkerId === marker.id ? ' selected' : ''}`}
                onClick={() => handleMarkerClick(marker)}
              >
                <div className="marker-color" style={{ background: marker.color }} />
                <div className="marker-info">
                  <span className="marker-label">{marker.label}</span>
                  <span className="marker-timecode">{formatMarkerPosition(marker)}</span>
                </div>
                <button
                  className="marker-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMarker(marker.id);
                  }}
                  title="Delete marker"
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
