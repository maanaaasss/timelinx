import { useCallback } from 'react';
import { toMarkerId } from '@timelinx/core';
import type { TimelineFrame, MarkerId } from '@timelinx/core';
import { useEngine, useMarkers } from '@timelinx/react';

const MARKER_COLORS = ['#ff4a6a', '#4a9eff', '#4aff8a', '#ffaa4a', '#9b59b6', '#e74c3c'];

export function MarkersPanel() {
  const engine = useEngine();
  const markers = useMarkers(engine);

  const handleAddMarker = useCallback(() => {
    const playheadFrame = engine.getPlayheadFrame();
    const id = toMarkerId(`marker-${Date.now()}`);
    const color = MARKER_COLORS[engine.getState().timeline.markers.length % MARKER_COLORS.length];

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
            label: `Marker ${engine.getState().timeline.markers.length + 1}`,
            color,
            scope: 'global' as const,
            linkedClipId: null,
          },
        },
      ],
    });
  }, [engine]);

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

  const formatTimecode = (frame: number, fps: number = 30) => {
    const totalSeconds = frame / fps;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const frames = frame % fps;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  const fps = Number(engine.getState().timeline.fps);

  return (
    <div className="markers-panel">
      <div className="markers-header">
        <span>Markers</span>
        <button
          className="tool-btn"
          title="Add marker at playhead"
          onClick={handleAddMarker}
          style={{ width: 24, height: 24, fontSize: 14 }}
        >
          +
        </button>
      </div>
      <div className="markers-list">
        {markers.length === 0 ? (
          <div className="markers-empty">
            No markers yet. Click + to add one at the playhead.
          </div>
        ) : (
          markers.map((marker) => (
            <div
              key={marker.id}
              className="marker-item"
              onClick={() => handleJumpTo(marker.type === 'point' ? marker.frame : marker.frameStart)}
            >
              <div
                className="marker-color"
                style={{ background: marker.color }}
              />
              <span className="marker-label">{marker.label}</span>
              <span className="marker-time">
                {formatTimecode(marker.type === 'point' ? marker.frame : marker.frameStart, fps)}
              </span>
              <button
                className="marker-delete"
                title="Delete marker"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(marker.id);
                }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
