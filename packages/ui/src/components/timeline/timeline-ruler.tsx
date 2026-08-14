import { useRef, useEffect, useCallback, type CSSProperties } from 'react';
import type { FrameRate } from '@timelinx/core';
import { rulerTickInterval, frameToTimecode } from '../../shared/time';
import { RulerPlayhead } from './ruler-playhead';

export interface TimelineRulerV2Props {
  fps: FrameRate;
  ppf: number;
  duration: number;
  scrollLeft: number;
  currentTime: number;
  onSeek: (frame: number) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  inPoint?: number | null;
  outPoint?: number | null;
}

export function TimelineRulerV2({
  fps,
  ppf,
  duration,
  scrollLeft,
  currentTime,
  onSeek,
  containerRef: externalContainerRef,
  inPoint,
  outPoint,
}: TimelineRulerV2Props) {
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef ?? internalRef;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const { major: majorIntervalFrames } = rulerTickInterval(ppf, fps);
  const totalWidth = duration * ppf;

  const handleRulerPlayheadDragStart = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollLeft;
      const frame = Math.max(0, Math.min(duration, Math.round(x / ppf)));
      onSeek(frame);
    };

    const handleUp = () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
  }, [containerRef, scrollLeft, ppf, duration, onSeek]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) return;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Read colors from CSS custom properties so we respect light/dark theme.
    const style = getComputedStyle(container);
    const minorTickColor =
      style.getPropertyValue('--tl-grid-line').trim() || 'rgba(255,255,255,0.04)';
    const majorTickColor =
      style.getPropertyValue('--border-default').trim() || 'rgba(255,255,255,0.10)';
    const labelColor = style.getPropertyValue('--text-tertiary').trim() || '#8888A0';
    const inOutRangeColor =
      style.getPropertyValue('--accent-subtle').trim() || 'rgba(224,122,47,0.08)';

    const startFrame = Math.floor(scrollLeft / ppf);
    const endFrame = Math.ceil((scrollLeft + w) / ppf);

    // In/Out point shading
    if (inPoint != null && outPoint != null && outPoint > inPoint) {
      const inX = Math.round(inPoint * ppf - scrollLeft);
      const outX = Math.round(outPoint * ppf - scrollLeft);
      ctx.fillStyle = inOutRangeColor;
      ctx.fillRect(inX, 0, outX - inX, h);
    }

    // Minor ticks
    const minorStep = Math.max(1, Math.round(ppf / 4));
    const firstMinor = Math.floor(startFrame / minorStep) * minorStep;
    ctx.strokeStyle = minorTickColor;
    ctx.lineWidth = 1;
    for (let f = firstMinor; f <= endFrame; f += minorStep) {
      const x = Math.round(f * ppf - scrollLeft) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, h * 0.5);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Major ticks + labels
    const firstMajor = Math.floor(startFrame / majorIntervalFrames) * majorIntervalFrames;
    ctx.strokeStyle = majorTickColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = labelColor;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textBaseline = 'top';

    for (let f = firstMajor; f <= endFrame; f += majorIntervalFrames) {
      const x = Math.round(f * ppf - scrollLeft) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.fillText(frameToTimecode(f, fps), x + 3, 2);
    }
  }, [fps, ppf, scrollLeft, majorIntervalFrames, containerRef, inPoint, outPoint]);

  // Schedule draw via rAF to batch rapid updates (zoom + scroll can fire
  // on the same frame). Cancel any pending rAF before scheduling a new one.
  const scheduleDraw = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      draw();
    });
  }, [draw]);

  useEffect(() => {
    scheduleDraw();
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleDraw]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => scheduleDraw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [scheduleDraw, containerRef]);

  const wrapperStyle: CSSProperties = {
    position: 'relative',
    width: totalWidth,
    height: '100%',
  };

  return (
    <div ref={containerRef} className="tl-ruler-canvas">
      <div style={wrapperStyle}>
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />
        <RulerPlayhead
          currentTime={currentTime}
          ppf={ppf}
          onDragStart={handleRulerPlayheadDragStart}
        />
      </div>
    </div>
  );
}
