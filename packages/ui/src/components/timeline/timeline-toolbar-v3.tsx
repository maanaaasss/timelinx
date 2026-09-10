import { useState, useRef, useEffect, useCallback, type MouseEvent } from 'react';
import type { FrameRate } from '@timelinx/core';
import {
  Scissors,
  Trash2,
  ChevronDown,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Minus,
  Plus,
} from 'lucide-react';
import { cn } from '../../shared/cn';
import { frameToTimecode, frameToMSS } from '../../shared/time';

/* ── Types ───────────────────────────────────────────────── */

export interface PageDefinition {
  id: string;
  name: string;
}

export interface TimelineToolbarV3Props {
  /* Timecode */
  currentTime: number;
  duration: number;
  fps: FrameRate;
  timeFormat?: 'mss' | 'timecode';

  /* Transport */
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onSkipBack?: () => void;
  onSkipForward?: () => void;

  /* Edit actions */
  onCut?: () => void;
  onDelete?: () => void;

  /* Page / Composition selector */
  pages?: PageDefinition[];
  activePage?: string;
  onPageChange?: (pageId: string) => void;

  /* Zoom */
  zoom: number;
  zoomMin: number;
  zoomMax: number;
  onZoomChange: (v: number) => void;
  onZoomFit?: () => void;

  className?: string;
}

/* ── Constants ───────────────────────────────────────────── */

const ICON_SIZE = 15;
const TRANSPORT_ICON_SIZE = 16;

/* ── Component ───────────────────────────────────────────── */

export function TimelineToolbarV3({
  currentTime,
  duration,
  fps,
  timeFormat = 'mss',
  isPlaying = false,
  onPlayPause,
  onSkipBack,
  onSkipForward,
  onCut,
  onDelete,
  pages,
  activePage,
  onPageChange,
  zoom,
  zoomMin,
  zoomMax,
  onZoomChange,
  onZoomFit,
  className,
}: TimelineToolbarV3Props) {
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const pageMenuRef = useRef<HTMLDivElement>(null);

  const activePageObj = pages?.find((p) => p.id === activePage);
  const currentTimecode =
    timeFormat === 'timecode'
      ? frameToTimecode(currentTime, fps)
      : frameToMSS(currentTime, fps);
  const durationTimecode =
    timeFormat === 'timecode'
      ? frameToTimecode(duration, fps)
      : frameToMSS(duration, fps);

  // Compute zoom percentage (relative to the range midpoint as 100%)
  const zoomPct = Math.round(((zoom - zoomMin) / (zoomMax - zoomMin)) * 100) || 1;

  // Close page menu on outside click
  useEffect(() => {
    if (!pageMenuOpen) return;
    const handleClick = (e: globalThis.MouseEvent) => {
      if (pageMenuRef.current && !pageMenuRef.current.contains(e.target as Node)) {
        setPageMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [pageMenuOpen]);

  const handlePageSelect = useCallback(
    (pageId: string) => {
      onPageChange?.(pageId);
      setPageMenuOpen(false);
    },
    [onPageChange],
  );

  const handleZoomOut = useCallback(() => {
    onZoomChange(Math.max(zoomMin, zoom / 1.4));
  }, [zoom, zoomMin, onZoomChange]);

  const handleZoomIn = useCallback(() => {
    onZoomChange(Math.min(zoomMax, zoom * 1.4));
  }, [zoom, zoomMax, onZoomChange]);

  return (
    <div className={cn('tl-toolbar-v3', className)}>
      {/* ── Left: Edit Actions ── */}
      <div className="tl-toolbar-v3-actions">
        <button
          className="tl-toolbar-v3-btn"
          title="Cut (C)"
          data-action="cut"
          onClick={onCut}
          disabled={!onCut}
        >
          <Scissors size={ICON_SIZE} />
        </button>
        <button
          className="tl-toolbar-v3-btn"
          title="Delete (Del)"
          data-action="delete"
          onClick={onDelete}
          disabled={!onDelete}
        >
          <Trash2 size={ICON_SIZE} />
        </button>

        {/* ── Page Selector ── */}
        {pages && pages.length > 0 && (
          <div className="tl-toolbar-v3-page-wrapper" ref={pageMenuRef}>
            <button
              className={cn('tl-toolbar-v3-page-select', pageMenuOpen && 'is-open')}
              onClick={() => setPageMenuOpen((v) => !v)}
            >
              <span className="tl-toolbar-v3-page-label">
                {activePageObj?.name ?? 'Page 1'}
              </span>
              <ChevronDown size={12} className="tl-toolbar-v3-page-chevron" />
            </button>
            {pageMenuOpen && (
              <div className="tl-toolbar-v3-page-menu">
                {pages.map((page) => (
                  <button
                    key={page.id}
                    className={cn(
                      'tl-toolbar-v3-page-menu-item',
                      page.id === activePage && 'is-active',
                    )}
                    onClick={() => handlePageSelect(page.id)}
                  >
                    {page.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Center: Transport ── */}
      <div className="tl-toolbar-v3-transport">
        <span className="tl-toolbar-v3-timecode">
          <span className="tl-toolbar-v3-timecode-current">{currentTimecode}</span>
          <span className="tl-toolbar-v3-timecode-sep"> / </span>
          <span className="tl-toolbar-v3-timecode-duration">{durationTimecode}</span>
        </span>

        <div className="tl-toolbar-v3-transport-btns">
          <button
            className="tl-toolbar-v3-transport-btn"
            title="Skip to start"
            data-action="skip-start"
            onClick={onSkipBack}
          >
            <SkipBack size={TRANSPORT_ICON_SIZE} />
          </button>
          <button
            className={cn('tl-toolbar-v3-transport-btn tl-toolbar-v3-play-btn', isPlaying && 'is-playing')}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            data-action={isPlaying ? 'pause' : 'play'}
            onClick={onPlayPause}
          >
            {isPlaying ? <Pause size={TRANSPORT_ICON_SIZE} /> : <Play size={TRANSPORT_ICON_SIZE} />}
          </button>
          <button
            className="tl-toolbar-v3-transport-btn"
            title="Skip to end"
            data-action="skip-end"
            onClick={onSkipForward}
          >
            <SkipForward size={TRANSPORT_ICON_SIZE} />
          </button>
        </div>
      </div>

      {/* ── Right: Zoom ── */}
      <div className="tl-toolbar-v3-zoom">
        <button
          className="tl-toolbar-v3-btn"
          title="Zoom out (−)"
          data-action="zoom-out"
          onClick={handleZoomOut}
        >
          <Minus size={ICON_SIZE} />
        </button>
        <button
          className="tl-toolbar-v3-btn"
          title="Zoom in (+)"
          data-action="zoom-in"
          onClick={handleZoomIn}
        >
          <Plus size={ICON_SIZE} />
        </button>
        <button
          className="tl-toolbar-v3-fit-btn"
          title="Fit to view"
          data-action="zoom-fit"
          onClick={onZoomFit}
        >
          Fit
        </button>
      </div>
    </div>
  );
}
