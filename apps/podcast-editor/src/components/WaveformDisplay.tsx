import React, { useRef, useEffect, useState } from 'react';

export interface WaveformSegment {
  id: string;
  startMs: number;
  endMs: number;
  amplitude: number[];
  color?: string;
}

interface WaveformDisplayProps {
  segments: WaveformSegment[];
  durationMs: number;
  currentTimeMs: number;
  markers: WaveformMarker[];
  onSeek: (ms: number) => void;
  onMarkerAdd: (ms: number) => void;
  selectedRegion?: { startMs: number; endMs: number } | null;
}

export interface WaveformMarker {
  id: string;
  timeMs: number;
  label: string;
  color: string;
}

export function WaveformDisplay({
  segments,
  durationMs,
  currentTimeMs,
  markers,
  onSeek,
  onMarkerAdd,
  selectedRegion,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    drawGrid(ctx, width, height, durationMs);
    drawSegments(ctx, segments, width, height, durationMs);
    drawSelectedRegion(ctx, selectedRegion, width, height, durationMs);
    drawPlayhead(ctx, currentTimeMs, width, height, durationMs);
    drawMarkers(ctx, markers, width, height, durationMs);
  }, [segments, durationMs, currentTimeMs, markers, selectedRegion]);

  function drawGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    totalMs: number,
  ) {
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;

    const interval = 5000;
    const msPerPx = totalMs / width;
    const step = Math.max(interval / msPerPx, 40);

    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    const midY = height / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();
  }

  function drawSegments(
    ctx: CanvasRenderingContext2D,
    segs: WaveformSegment[],
    width: number,
    height: number,
    totalMs: number,
  ) {
    const midY = height / 2;

    for (const seg of segs) {
      const startX = (seg.startMs / totalMs) * width;
      const endX = (seg.endMs / totalMs) * width;
      const segWidth = endX - startX;
      const color = seg.color || '#7a94ff';

      const barCount = seg.amplitude.length;
      const barWidth = segWidth / barCount;

      for (let i = 0; i < barCount; i++) {
        const amp = seg.amplitude[i] ?? 0;
        const barH = amp * midY * 0.85;
        const x = startX + i * barWidth;

        const gradient = ctx.createLinearGradient(x, midY - barH, x, midY + barH);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, `${color}cc`);
        gradient.addColorStop(1, color);

        ctx.fillStyle = gradient;
        ctx.fillRect(x, midY - barH, Math.max(barWidth - 1, 1), barH * 2);
      }
    }
  }

  function drawSelectedRegion(
    ctx: CanvasRenderingContext2D,
    region: { startMs: number; endMs: number } | null | undefined,
    width: number,
    height: number,
    totalMs: number,
  ) {
    if (!region) return;

    const startX = (region.startMs / totalMs) * width;
    const endX = (region.endMs / totalMs) * width;

    ctx.fillStyle = 'rgba(122,148,255,0.08)';
    ctx.fillRect(startX, 0, endX - startX, height);

    ctx.strokeStyle = 'rgba(122,148,255,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(startX, 0, endX - startX, height);
    ctx.setLineDash([]);
  }

  function drawPlayhead(
    ctx: CanvasRenderingContext2D,
    timeMs: number,
    width: number,
    height: number,
    totalMs: number,
  ) {
    const x = (timeMs / totalMs) * width;

    ctx.fillStyle = '#f7f9ff';
    ctx.shadowColor = 'rgba(247,249,255,0.4)';
    ctx.shadowBlur = 12;
    ctx.fillRect(x - 1, 0, 2, height);
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.moveTo(x - 5, 0);
    ctx.lineTo(x + 5, 0);
    ctx.lineTo(x, 8);
    ctx.closePath();
    ctx.fill();
  }

  function drawMarkers(
    ctx: CanvasRenderingContext2D,
    markers: WaveformMarker[],
    width: number,
    height: number,
    totalMs: number,
  ) {
    for (const marker of markers) {
      const x = (marker.timeMs / totalMs) * width;

      ctx.fillStyle = `${marker.color}33`;
      ctx.fillRect(x - 1, 0, 2, height);

      ctx.fillStyle = marker.color;
      ctx.beginPath();
      ctx.moveTo(x - 5, height);
      ctx.lineTo(x + 5, height);
      ctx.lineTo(x, height - 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = marker.color;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(marker.label, x, height - 12);
    }
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const fraction = x / rect.width;
    onSeek(fraction * durationMs);
  }

  function handleDoubleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const fraction = x / rect.width;
    onMarkerAdd(fraction * durationMs);
  }

  return (
    <div ref={containerRef} className="waveform-display">
      <canvas
        ref={canvasRef}
        className="waveform-canvas"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      />
      <div className="waveform-time-axis">
        {Array.from({ length: 11 }, (_, i) => {
          const ms = (durationMs / 10) * i;
          const mins = Math.floor(ms / 60000);
          const secs = Math.floor((ms % 60000) / 1000);
          return (
            <span key={i} className="waveform-tick">
              {mins}:{secs.toString().padStart(2, '0')}
            </span>
          );
        })}
      </div>
    </div>
  );
}
