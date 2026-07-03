import React, { useRef } from 'react';
import { useTrackIdsWithEngine, useTrackWithEngine, useClips } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import { TimelineTrack } from './timeline-track';
import { getFriendlyTrackLabel } from '../shared/time';

export interface TrackListProps {
  trackHeights: Record<string, number>;
  onTrackHeightChange: (trackId: string, height: number) => void;
  clipCounts: Map<string, number>;
  className?: string;
}

export const TrackList = React.memo(function TrackList({
  trackHeights,
  onTrackHeightChange,
  clipCounts,
  className,
}: TrackListProps) {
  const { engine, ppf, scrollRef } = useTimelineContext();
  const labelColumnRef = useRef<HTMLDivElement>(null);
  const resizeDragRef = useRef<{ trackId: string; startY: number; startHeight: number } | null>(null);

  const trackIds = useTrackIdsWithEngine(engine);

  const trackTypesMap = React.useMemo(() => {
    const map = new Map<string, string>();
    const state = engine.getState();
    for (const t of state.timeline.tracks) {
      map.set(t.id as string, t.type);
    }
    return map;
  }, [trackIds]);

  const getTrackHeight = React.useCallback(
    (trackId: string) => {
      if (trackHeights[trackId] !== undefined) return trackHeights[trackId];
      const type = trackTypesMap.get(trackId);
      return type === 'video' ? 80 : 68;
    },
    [trackHeights, trackTypesMap],
  );

  const firstAudioIdx = trackIds.findIndex((tid) => trackTypesMap.get(tid) === 'audio');

  return (
    <div ref={labelColumnRef} className={`timeline-label-column${className ? ` ${className}` : ''}`}>
      <div className="timeline-label-header">
        <span className="timecode">
          {/* Timecode display will be handled by parent */}
        </span>
      </div>

      {trackIds.map((tid, i) => {
        const h = getTrackHeight(tid);
        const type = trackTypesMap.get(tid) ?? 'video';
        const friendlyLabel = getFriendlyTrackLabel(tid, type, trackIds, trackTypesMap);
        const isSep = firstAudioIdx > 0 && i === firstAudioIdx;
        return (
          <div key={tid} style={{ position: 'relative' }}>
            {isSep && <div className="timeline-track-separator" />}
            <TimelineTrack
              trackId={tid}
              shortId={friendlyLabel}
              height={h}
              clipCount={clipCounts.get(tid) ?? 0}
            />
            <div
              role="separator"
              aria-orientation="horizontal"
              aria-label={`Resize ${tid}`}
              tabIndex={0}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 4,
                cursor: 'row-resize',
                zIndex: 3,
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                resizeDragRef.current = { trackId: tid, startY: e.clientY, startHeight: h };
              }}
            />
          </div>
        );
      })}
    </div>
  );
});
