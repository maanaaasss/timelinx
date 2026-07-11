import React, { useCallback } from 'react';
import { toMarkerId } from '@timelinx/core';
import type { TimelineFrame, MarkerId } from '@timelinx/core';
import { useEngine, useMarkers } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import { frameToTimecode } from '../shared/time';

const MARKER_COLORS = ['#ff4a6a', '#4a9eff', '#4aff8a', '#ffaa4a', '#9b59b6', '#e74c3c'];

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
  const markers = useMarkers(engine) as unknown as Marker[];

  const fps = Number(engine.getState().timeline.fps);

  const handleAddMarker = useCallback(() => {
    const playheadFrame = engine.getPlayheadFrame();
    const id = toMarkerId(`marker-${Date.now()}`);
    const color = MARKER_COLORS[markers.length % MARKER_COLORS.length];

    engine.dispatch({
      id: `add-marker-${Date.now()}`,
      label: 'Add marker',
      timestamp: Date.now(),
      operations: [
        {
          type: 'ADD_MARKER',
          marker: {
            type: 'point',
            id,
            frame: playheadFrame,
            label: `Marker ${markers.length + 1}`,
            color,
            scope: 'global' as const,
            linkedClipId: null,
          },
        },
      ],
    });
  }, [engine, markers.length]);

  const handleJumpTo = useCallback(
    (frame: number) => {
      engine.seekTo(frame as TimelineFrame);
    },
    [engine],
  );

  const handleDelete = useCallback(
    (markerId: string) => {
      engine.dispatch({
        id: `delete-marker-${Date.now()}`,
        label: 'Delete marker',
        timestamp: Date.now(),
        operations: [
          {
            type: 'DELETE_MARKER',
            markerId: markerId as MarkerId,
          },
        ],
      });
    },
    [engine],
  );

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
        <button
          className="panel-action-btn"
          title="Add marker at playhead"
          onClick={handleAddMarker}
        >
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
                className="marker-item"
                onClick={() => handleJumpTo(marker.type === 'point' ? (marker.frame as number) : (marker.frameStart as number))}
              >
                <div
                  className="marker-color"
                  style={{ background: marker.color }}
                />
                <div className="marker-info">
                  <span className="marker-label">{marker.label}</span>
                  <span className="marker-timecode">{formatMarkerPosition(marker)}</span>
                </div>
                <button
                  className="marker-delete-btn"
                  title="Delete marker"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(marker.id);
                  }}
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
