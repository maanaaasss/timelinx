import type { FrameRate } from '@timelinx/core';
import { MousePointer2, Scissors, Hand, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '../lib/cn';
import { ZoomSlider } from './zoom-slider';

export type ToolId = 'select' | 'razor' | 'hand';

export interface TimelineToolbarProps {
  activeTool: ToolId;
  onToolChange: (tool: ToolId) => void;
  currentTime: number;
  fps: FrameRate;
  zoom: number;
  zoomMin: number;
  zoomMax: number;
  zoomDefault: number;
  onZoomChange: (v: number) => void;
}

function formatTimecode(frame: number, fps: number): string {
  const totalSeconds = frame / fps;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const f = Math.floor(frame % fps);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

const tools: { id: ToolId; icon: typeof MousePointer2; label: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select (V)' },
  { id: 'razor', icon: Scissors, label: 'Razor (C)' },
  { id: 'hand', icon: Hand, label: 'Hand (H)' },
];

export function TimelineToolbar({
  activeTool,
  onToolChange,
  currentTime,
  fps,
  zoom,
  zoomMin,
  zoomMax,
  zoomDefault,
  onZoomChange,
}: TimelineToolbarProps) {
  return (
    <div className="tl-toolbar">
      <div className="tl-toolbar-tools">
        {tools.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={cn('tl-toolbar-btn', activeTool === id && 'is-active')}
            title={label}
            onClick={() => onToolChange(id)}
          >
            <Icon size={15} />
          </button>
        ))}
      </div>

      <div className="tl-toolbar-timecode">
        {formatTimecode(currentTime, fps)}
      </div>

      <div className="tl-toolbar-zoom">
        <button
          className="tl-toolbar-btn"
          title="Zoom out"
          onClick={() => onZoomChange(Math.max(zoomMin, zoom / 1.5))}
        >
          <ZoomOut size={14} />
        </button>
        <ZoomSlider
          value={zoom}
          min={zoomMin}
          max={zoomMax}
          defaultValue={zoomDefault}
          onChange={onZoomChange}
        />
        <button
          className="tl-toolbar-btn"
          title="Zoom in"
          onClick={() => onZoomChange(Math.min(zoomMax, zoom * 1.5))}
        >
          <ZoomIn size={14} />
        </button>
      </div>
    </div>
  );
}
