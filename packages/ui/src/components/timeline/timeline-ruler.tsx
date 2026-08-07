import { useRef, useEffect, useCallback, type CSSProperties } from 'react';
import type { FrameRate, TimelineFrame } from '@timelinx/core';
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
}

export function TimelineRulerV2({ fps, ppf, duration, scrollLeft, currentTime, onSeek, containerRef: externalContainerRef }: TimelineRulerV2Props) {
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef ?? internalRef;
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const startFrame = Math.floor(scrollLeft / ppf);
    const endFrame = Math.ceil((scrollLeft + w) / ppf);

    // Minor ticks
    const minorStep = Math.max(1, Math.round(ppf / 4));
    const firstMinor = Math.floor(startFrame / minorStep) * minorStep;
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
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
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#8888A0';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textBaseline = 'top';

    for (let f = firstMajor; f <= endFrame; f += majorIntervalFrames) {
      const x = Math.round(f * ppf - scrollLeft) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();

      const seconds = f / fps;
      ctx.fillText(frameToTimecode(f, fps), x + 3, 2);
    }
  }, [fps, ppf, scrollLeft, majorIntervalFrames, containerRef]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => draw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw, containerRef]);

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
