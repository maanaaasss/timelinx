import React, { useMemo } from 'react';
import type { TimelineEngine } from '@webpacked-timeline/react';
import { useTimelineWithEngine as useTimeline } from '@webpacked-timeline/react';

export function StatusBar({
  engine,
  onShowShortcuts,
}: {
  engine: TimelineEngine;
  onShowShortcuts: () => void;
}) {
  const timeline = useTimeline(engine);

  const { trackCount, clipCount } = useMemo(() => {
    let clips = 0;
    for (const t of timeline.tracks) {
      clips += t.clips.length;
    }
    return { trackCount: timeline.tracks.length, clipCount: clips };
  }, [timeline]);

  return (
    <div className="demo-status-bar">
      <span className="demo-status-left">{timeline.name}</span>
      <span className="demo-status-center">
        {trackCount} tracks · {clipCount} clips
      </span>
      <span className="demo-status-right" onClick={onShowShortcuts}>
        ? Shortcuts
      </span>
    </div>
  );
}
