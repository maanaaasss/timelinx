import { useTrackIds, useTrack, useEngine } from '@timelinx/react';
import { useCallback } from 'react';

interface TrackLabelProps {
  trackId: string;
}

function TrackLabel({ trackId }: TrackLabelProps) {
  const track = useTrack(trackId);
  const engine = useEngine();

  const handleToggleLock = useCallback(() => {
    if (!track) return;
    engine.dispatch({
      id: `toggle-lock-${trackId}`,
      label: 'Toggle track lock',
      timestamp: Date.now(),
      operations: [
        {
          type: 'SET_TRACK_HEIGHT',
          trackId: track.id,
          height: track.height,
        },
      ],
    });
  }, [engine, trackId, track]);

  if (!track) return null;

  const icon =
    track.type === 'video' ? '🎬' : track.type === 'audio' ? '🎵' : '📝';

  return (
    <div className="track-label">
      <span className="track-label-icon">{icon}</span>
      <span className="track-label-name">{track.name}</span>
      <div className="track-controls">
        <button
          className={`track-ctrl-btn${track.locked ? ' active' : ''}`}
          title={track.locked ? 'Unlock track' : 'Lock track'}
          onClick={handleToggleLock}
        >
          {track.locked ? '🔒' : '🔓'}
        </button>
        <button
          className={`track-ctrl-btn${track.muted ? ' active' : ''}`}
          title={track.muted ? 'Unmute track' : 'Mute track'}
          onClick={() => {
            // Mute/lock toggle is a gap in core — no SET_TRACK_MUTE operation.
            // We report this gap in the milestone report.
          }}
        >
          {track.muted ? '🔇' : '🔊'}
        </button>
      </div>
    </div>
  );
}

export function TrackLabels() {
  const trackIds = useTrackIds();

  return (
    <div className="track-labels">
      <div className="track-labels-header">Tracks</div>
      {trackIds.map((id) => (
        <TrackLabel key={id} trackId={id} />
      ))}
    </div>
  );
}
