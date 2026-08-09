import type { FrameRate } from '@timelinx/core';
import { MousePointer2, Scissors, Hand, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '../../shared/cn';
import { frameToTimecode } from '../../shared/time';
import { ZoomSlider } from './zoom-slider';

export type ToolId = 'select' | 'razor' | 'hand';

export interface TimelineToolbarV2Props {
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

const tools: { id: ToolId; icon: typeof MousePointer2; label: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select (V)' },
  { id: 'razor', icon: Scissors, label: 'Razor (B)' },
  { id: 'hand', icon: Hand, label: 'Hand (H)' },
];

export function TimelineToolbarV2({
  activeTool,
  onToolChange,
  currentTime,
  fps,
  zoom,
  zoomMin,
  zoomMax,
  zoomDefault,
  onZoomChange,
}: TimelineToolbarV2Props) {
  return (
    <div className="tl-toolbar-v2">
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
        {frameToTimecode(currentTime, fps)}
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
