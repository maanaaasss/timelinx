import React from 'react';
import { useTimelineWithEngine, useSelectedClipIds, useActiveToolId, usePlayheadFrame } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import { frameToTimecode } from '../shared/time';

export interface StatusBarProps {
  className?: string;
}

export const StatusBar = React.memo(function StatusBar({
  className,
}: StatusBarProps) {
  const { engine } = useTimelineContext();
  const timeline = useTimelineWithEngine(engine);
  const selectedClipIds = useSelectedClipIds(engine);
  const activeToolId = useActiveToolId(engine);
  const playheadFrame = usePlayheadFrame(engine);

  const fps = Number(timeline?.fps ?? 30);
  const duration = Number(timeline?.duration ?? 0);
  const totalClips = (timeline?.tracks ?? []).reduce(
    (sum, track) => sum + track.clips.length,
    0,
  );

  return (
    <div className={`status-bar${className ? ` ${className}` : ''}`}>
      <div className="status-item">
        <span className="status-label">Position:</span>
        <span className="status-value">{frameToTimecode(playheadFrame as number, fps)}</span>
      </div>
      <div className="status-item">
        <span className="status-label">Duration:</span>
        <span className="status-value">{frameToTimecode(duration, fps)}</span>
      </div>
      <div className="status-item">
        <span className="status-label">FPS:</span>
        <span className="status-value">{fps}</span>
      </div>
      <div className="status-item">
        <span className="status-label">Tracks:</span>
        <span className="status-value">{(timeline?.tracks ?? []).length}</span>
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
});
