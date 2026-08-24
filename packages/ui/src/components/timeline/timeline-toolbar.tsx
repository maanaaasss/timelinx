import type { FrameRate } from '@timelinx/core';
import { MousePointer2, Scissors, Hand, ZoomIn, ZoomOut, Plus } from 'lucide-react';
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
  onAddTrack?: (type: 'video' | 'audio') => void;
}

const tools: { id: ToolId; icon: typeof MousePointer2; label: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select (V)' },
  { id: 'razor', icon: Scissors, label: 'Razor / Blade (B)' },
  { id: 'hand', icon: Hand, label: 'Hand (H)' },
];

const TOOL_ICON_SIZE = 13;
const ZOOM_ICON_SIZE = 12;
const ADD_ICON_SIZE = 11;

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
  onAddTrack,
}: TimelineToolbarV2Props) {
  return (
    <div className="tl-toolbar-v2">
      {/* Tool group */}
      <div className="tl-toolbar-tools">
        {tools.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={cn('tl-toolbar-btn', activeTool === id && 'is-active')}
            title={label}
            onClick={() => onToolChange(id)}
          >
            <Icon size={TOOL_ICON_SIZE} />
          </button>
        ))}
      </div>

      <div className="tl-toolbar-separator" />

      {/* Timecode */}
      <div className="tl-toolbar-timecode">{frameToTimecode(currentTime, fps)}</div>

      {/* Zoom */}
      <div className="tl-toolbar-zoom">
        <button
          className="tl-toolbar-btn"
          title="Zoom out (–)"
          onClick={() => onZoomChange(Math.max(zoomMin, zoom / 1.5))}
        >
          <ZoomOut size={ZOOM_ICON_SIZE} />
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
          title="Zoom in (+)"
          onClick={() => onZoomChange(Math.min(zoomMax, zoom * 1.5))}
        >
          <ZoomIn size={ZOOM_ICON_SIZE} />
        </button>
      </div>

      {/* Add track (optional) */}
      {onAddTrack && (
        <>
          <div className="tl-toolbar-separator" />
          <div className="tl-toolbar-tools">
            <button
              className="tl-toolbar-btn"
              title="Add video track"
              onClick={() => onAddTrack('video')}
            >
              <Plus size={ADD_ICON_SIZE} />
              <span className="tl-toolbar-add-label">V</span>
            </button>
            <button
              className="tl-toolbar-btn"
              title="Add audio track"
              onClick={() => onAddTrack('audio')}
            >
              <Plus size={ADD_ICON_SIZE} />
              <span className="tl-toolbar-add-label">A</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
