import { useRef, useCallback, useState, useEffect } from 'react';
import {
  useEngine,
  useTimeline,
  useTrackIds,
  useSelectedClipIds,
  usePlayheadFrame,
  useToolRouter,
} from '@timelinx/react';
import type { TimelineFrame } from '@timelinx/core';
import { TrackView } from './TrackView';
import { Ruler } from './Ruler';
import { Playhead } from './Playhead';

const DEFAULT_PPF = 4;

export function TimelineView() {
  const engine = useEngine();
  const timeline = useTimeline();
  const trackIds = useTrackIds();
  const selectedClipIds = useSelectedClipIds(engine);
  const playheadFrame = usePlayheadFrame(engine);
  const containerRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const [ppf, setPpf] = useState(DEFAULT_PPF);

  const getPixelsPerFrame = useCallback(() => ppf, [ppf]);
  const getScrollLeft = useCallback(
    () => containerRef.current?.scrollLeft ?? 0,
    [],
  );

  // Bug 6 fix: Apply cursor directly to DOM via ref, not React state.
  // This avoids re-rendering TimelineView (and all children) on every cursor change.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let lastCursor = '';
    const unsub = engine.subscribe(() => {
      const snap = engine.getSnapshot();
      const cursor = snap.cursor;
      if (cursor !== lastCursor) {
        lastCursor = cursor;
        el.style.cursor = cursor;
      }
    });
    el.style.cursor = engine.getSnapshot().cursor;
    return unsub;
  }, [engine]);

  // Bug 7 fix: Sync ruler scroll via direct DOM updates, not React state.
  // This avoids re-rendering TimelineView (and all children) on every scroll event.
  useEffect(() => {
    const el = containerRef.current;
    const ruler = rulerRef.current;
    if (!el || !ruler) return;

    const onScroll = () => {
      const sl = el.scrollLeft;
      // Clamp scroll to prevent overscroll stretch at boundaries
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (sl < 0) { el.scrollLeft = 0; return; }
      if (sl > maxScroll) { el.scrollLeft = maxScroll; return; }
      ruler.dispatchEvent(new CustomEvent('ruler-scroll', { detail: { scrollLeft: sl } }));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleZoom = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.delta) {
        setPpf((prev) => Math.max(0.5, Math.min(100, prev * detail.delta)));
      }
    };
    window.addEventListener('timeline-zoom', handleZoom);
    return () => window.removeEventListener('timeline-zoom', handleZoom);
  }, []);

  const handlers = useToolRouter(engine, { getPixelsPerFrame, getScrollLeft });

  const handleRulerClick = useCallback(
    (frame: number) => {
      engine.seekTo(frame as TimelineFrame);
    },
    [engine],
  );

  const timelineWidth = Number(timeline.duration) * ppf;

  return (
    <div className="timeline-area">
      <Ruler
        ref={rulerRef}
        ppf={ppf}
        fps={Number(timeline.fps)}
        playheadFrame={playheadFrame}
        onClick={handleRulerClick}
      />
      <div
        ref={containerRef}
        className="timeline-tracks"
        data-timeline-container="true"
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerLeave={handlers.onPointerLeave}
        onKeyDown={handlers.onKeyDown}
        style={{ touchAction: 'none' }}
        tabIndex={0}
      >
        <div
          className="timeline-tracks-inner"
          style={{ width: timelineWidth }}
        >
          {trackIds.map((id) => (
            <TrackView
              key={id}
              trackId={id}
              ppf={ppf}
              selectedClipIds={selectedClipIds}
            />
          ))}
          <Playhead frame={playheadFrame} ppf={ppf} />
        </div>
      </div>
    </div>
  );
}
