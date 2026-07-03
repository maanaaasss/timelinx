/**
 * CustomControls — headless playback controls
 *
 * Builds transport controls from scratch using engine methods.
 * Demonstrates how the headless API exposes playback state and actions
 * without prescribing any UI.
 *
 * Note: usePlayhead requires a PlaybackEngine. When unavailable, we fall back
 * to engine.seekTo for manual scrubbing.
 */
import { useCallback } from 'react';
import { usePlayheadFrame, useIsPlaying, useTimelineWithEngine } from '@timelinx/react';
import type { TimelineEngine } from '@timelinx/react';
import { toFrame } from '@timelinx/core';

function formatTimecode(frame: number, fps: number): string {
  const totalSeconds = Math.floor(frame / fps);
  const f = frame % fps;
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

interface CustomControlsProps {
  engine: TimelineEngine;
}

export function CustomControls({ engine }: CustomControlsProps) {
  const playheadFrame = usePlayheadFrame();
  const isPlaying = useIsPlaying();
  const timeline = useTimelineWithEngine(engine);
  const fps = (timeline?.fps as number) ?? 30;
  const duration = (timeline?.duration as number) ?? 0;

  const togglePlay = useCallback(() => {
    const playback = engine.playbackEngine;
    if (playback) {
      if (isPlaying) playback.pause();
      else playback.play();
    }
  }, [engine, isPlaying]);

  const seekToStart = useCallback(() => {
    engine.seekTo(toFrame(0));
  }, [engine]);

  const seekToEnd = useCallback(() => {
    engine.seekTo(toFrame(Math.max(0, duration - 1)));
  }, [engine, duration]);

  const seekBack = useCallback(() => {
    engine.seekTo(toFrame(Math.max(0, (playheadFrame as number) - 30)));
  }, [engine, playheadFrame]);

  const seekForward = useCallback(() => {
    engine.seekTo(toFrame(Math.min(duration - 1, (playheadFrame as number) + 30)));
  }, [engine, playheadFrame, duration]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const frame = parseInt(e.target.value, 10);
    engine.seekTo(toFrame(frame));
  }, [engine]);

  return (
    <div className="headless-controls">
      <div className="headless-controls-left">
        <span className="headless-timecode">{formatTimecode(playheadFrame as number, fps)}</span>
      </div>

      <div className="headless-controls-center">
        <button className="headless-btn" onClick={seekToStart} title="Go to start">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3 3h2v10H3V3zm3 5l8-5v10L6 8z" />
          </svg>
        </button>
        <button className="headless-btn" onClick={seekBack} title="Back 1 second">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12 3L5 8l7 5V3z" />
          </svg>
        </button>
        <button className="headless-btn headless-btn-play" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <rect x="5" y="4" width="3" height="12" rx="1" />
              <rect x="12" y="4" width="3" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6 3l10 7-10 7V3z" />
            </svg>
          )}
        </button>
        <button className="headless-btn" onClick={seekForward} title="Forward 1 second">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 3l7 5-7 5V3z" />
          </svg>
        </button>
        <button className="headless-btn" onClick={seekToEnd} title="Go to end">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11 3h2v10h-2V3zM3 3l8 5-8 5V3z" />
          </svg>
        </button>
      </div>

      <div className="headless-controls-right">
        <input
          type="range"
          className="headless-seekbar"
          min={0}
          max={Math.max(0, duration - 1)}
          value={playheadFrame as number}
          onChange={handleSeek}
        />
      </div>
    </div>
  );
}
