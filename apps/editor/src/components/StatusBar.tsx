import { useEngine, useTimeline, useSelectedClipIds, useActiveToolId } from '@timelinx/react';

export function StatusBar() {
  const engine = useEngine();
  const timeline = useTimeline();
  const selectedClipIds = useSelectedClipIds(engine);
  const activeToolId = useActiveToolId(engine);
  const snapshot = engine.getSnapshot();

  const fps = Number(timeline.fps);
  const duration = Number(timeline.duration);
  const totalSeconds = duration / fps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const playheadFrame = Number(snapshot.playhead.currentFrame);
  const playheadSeconds = playheadFrame / fps;
  const phMinutes = Math.floor(playheadSeconds / 60);
  const phSeconds = Math.floor(playheadSeconds % 60);
  const phFrames = playheadFrame % fps;

  const totalClips = timeline.tracks.reduce(
    (sum, track) => sum + track.clips.length,
    0,
  );

  return (
    <div className="status-bar">
      <div className="status-item">
        <span className="status-label">Position:</span>
        <span className="status-value">
          {String(phMinutes).padStart(2, '0')}:
          {String(phSeconds).padStart(2, '0')}:
          {String(phFrames).padStart(2, '0')}
        </span>
      </div>
      <div className="status-item">
        <span className="status-label">Duration:</span>
        <span className="status-value">
          {minutes}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
      <div className="status-item">
        <span className="status-label">FPS:</span>
        <span className="status-value">{fps}</span>
      </div>
      <div className="status-item">
        <span className="status-label">Tracks:</span>
        <span className="status-value">{timeline.tracks.length}</span>
      </div>
      <div className="status-item">
        <span className="status-label">Clips:</span>
        <span className="status-value">{totalClips}</span>
      </div>
      <div className="status-item">
        <span className="status-label">Selected:</span>
        <span className="status-value">{selectedClipIds.size}</span>
      </div>
      <div className="status-item">
        <span className="status-label">Tool:</span>
        <span className="status-value">{activeToolId}</span>
      </div>
    </div>
  );
}
