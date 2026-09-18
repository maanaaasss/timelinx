import {
  useRef,
  useLayoutEffect,
  useEffect,
  useCallback,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import type { FrameRate } from '@timelinx/core';
import { cn } from '../../shared/cn';
import { formatMSS } from '../../shared/time';
import { RulerPlayheadV3 } from './ruler-playhead-v3';

export interface TimelineRulerV3Props {
  fps: FrameRate;
  ppf: number;
  duration: number;
  scrollLeft?: number;
  currentTime: number;
  onSeek: (frame: number) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  inPoint?: number | null;
  outPoint?: number | null;
  className?: string;
  height?: number;
  minVisibleSeconds?: number;
  showPlayheadLine?: boolean;
  onWheel?: (e: ReactWheelEvent<HTMLDivElement>) => void;
  syncScrollRef?: React.MutableRefObject<((scrollLeft: number) => void) | null>;
}

export function TimelineRulerV3({
  fps,
  ppf,
  duration,
  scrollLeft = 0,
  currentTime,
  onSeek,
  containerRef: externalContainerRef,
  inPoint,
  outPoint,
  className,
  height = 26,
  minVisibleSeconds = 7,
  showPlayheadLine = false,
  onWheel,
  syncScrollRef,
}: TimelineRulerV3Props) {
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef ?? internalRef;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const currentScrollLeftRef = useRef(scrollLeft);
  currentScrollLeftRef.current = scrollLeft;

  const safeFps = fps > 0 ? fps : 30;
  const totalFrames = Math.max(duration, minVisibleSeconds * safeFps);
  const totalWidth = Math.max(totalFrames * ppf, 800);

  const handleRulerTrackPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // Ignore clicks that originated directly on the playhead handle itself
      if ((e.target as HTMLElement).closest('.tl-ruler-v3-playhead-handle')) {
        return;
      }

      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const getFrame = (clientX: number) => {
        const x = clientX - rect.left + currentScrollLeftRef.current;
        const rawFrame = Math.round(x / ppf);
        const maxF = duration > 0 ? duration : totalFrames;
        return Math.max(0, Math.min(maxF, rawFrame));
      };

      const target = e.currentTarget as HTMLElement;
      const pointerId = e.pointerId;
      try {
        target.setPointerCapture(pointerId);
      } catch {}

      onSeek(getFrame(e.clientX));

      const handlePointerMove = (moveEvent: PointerEvent) => {
        onSeek(getFrame(moveEvent.clientX));
      };

      const handlePointerUp = () => {
        try {
          target.releasePointerCapture(pointerId);
        } catch {}
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [containerRef, ppf, duration, totalFrames, onSeek],
  );

  const draw = useCallback(
    (overrideScrollLeft?: number) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const activeScrollLeft = overrideScrollLeft ?? currentScrollLeftRef.current;
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = height;
      if (w === 0 || h === 0) return;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const style = getComputedStyle(container);
      const textColor = style.getPropertyValue('--text-tertiary').trim() || '#8a8a9e';
      const dotColor = 'rgba(138, 138, 158, 0.45)';
      const inOutRangeColor =
        style.getPropertyValue('--accent-subtle').trim() || 'rgba(255, 255, 255, 0.05)';

      // In/Out point shading
      if (inPoint != null && outPoint != null && outPoint > inPoint) {
        const inX = Math.round(inPoint * ppf - activeScrollLeft);
        const outX = Math.round(outPoint * ppf - activeScrollLeft);
        ctx.fillStyle = inOutRangeColor;
        ctx.fillRect(inX, 0, outX - inX, h);
      }

      // Determine max seconds to render across visible track
      const visibleWidth = Math.max(w, totalWidth);
      const maxSec = Math.max(
        minVisibleSeconds,
        Math.ceil(duration / safeFps),
        Math.ceil((activeScrollLeft + visibleWidth) / (ppf * safeFps)),
      );

      ctx.font =
        '500 10px "Inter", "Roboto", -apple-system, BlinkMacSystemFont, ui-sans-serif, sans-serif';
      ctx.textBaseline = 'middle';

      const textY = Math.round(h / 2);

      for (let s = 0; s <= maxSec; s++) {
        const xSec = Math.round(s * safeFps * ppf - activeScrollLeft);

        // Only draw if within visible viewport bounds
        if (xSec >= -40 && xSec <= w + 40) {
          ctx.fillStyle = textColor;
          if (s === 0) {
            ctx.textAlign = 'left';
            ctx.fillText('0:00', Math.max(xSec, 4), textY);
          } else {
            ctx.textAlign = 'center';
            ctx.fillText(formatMSS(s), xSec, textY);
          }
        }

        // Draw subtle grey dot at half-second mark between each second
        const xDot = Math.round((s + 0.5) * safeFps * ppf - activeScrollLeft);
        if (xDot >= 0 && xDot <= w && s + 0.5 <= maxSec + 0.5) {
          ctx.beginPath();
          ctx.arc(xDot, textY, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = dotColor;
          ctx.fill();
        }
      }
    },
    [
      safeFps,
      ppf,
      duration,
      height,
      minVisibleSeconds,
      totalWidth,
      inPoint,
      outPoint,
      containerRef,
    ],
  );

  const scheduleDraw = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      draw();
    });
  }, [draw]);

  useLayoutEffect(() => {
    draw();
  }, [draw, scrollLeft, ppf, duration, currentTime, inPoint, outPoint]);

  useEffect(() => {
    if (!syncScrollRef) return;
    syncScrollRef.current = (newScrollLeft: number) => {
      currentScrollLeftRef.current = newScrollLeft;
      draw(newScrollLeft);
      if (playheadRef.current) {
        playheadRef.current.style.left = `${currentTime * ppf - newScrollLeft}px`;
      }
    };
    return () => {
      if (syncScrollRef) syncScrollRef.current = null;
    };
  }, [syncScrollRef, draw, currentTime, ppf]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => scheduleDraw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [scheduleDraw, containerRef]);

  const wrapperStyle: CSSProperties = {
    position: 'relative',
    width: totalWidth,
    height: `${height}px`,
  };

  return (
    <div
      ref={containerRef}
      className={cn('tl-ruler-v3-track', className)}
      style={{ height: `${height}px` }}
      onPointerDown={handleRulerTrackPointerDown}
      onWheel={onWheel}
    >
      <div style={wrapperStyle}>
        <canvas
          ref={canvasRef}
          className="tl-ruler-v3-canvas"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${height}px` }}
        />
        <RulerPlayheadV3
          wrapperRef={playheadRef}
          currentTime={currentTime}
          ppf={ppf}
          scrollLeft={scrollLeft}
          duration={duration > 0 ? duration : totalFrames}
          onSeek={onSeek}
          showLine={showPlayheadLine}
        />
      </div>
    </div>
  );
}
