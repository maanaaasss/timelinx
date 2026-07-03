import React, { useCallback } from 'react';
import type { TimelineEngine } from '@timelinx/react';
import { usePlayheadFrame, useIsPlaying, useTimelineWithEngine } from '@timelinx/react';
import {
  SkipBack, SkipForward, Play, Pause, Volume2,
  StepBack, StepForward, Maximize2,
} from 'lucide-react';
import { toFrame } from '@timelinx/core';

interface ViewerProps {
  engine: TimelineEngine;
}

export function Viewer({ engine }: ViewerProps) {
  const frame = usePlayheadFrame(engine);
  const isPlaying = useIsPlaying(engine);
  const timeline = useTimelineWithEngine(engine);

  const fps = (timeline?.fps as number) ?? 30;
  const durationFrames = (timeline?.duration as number) ?? 0;

  const progress = durationFrames > 0
    ? Math.min(1, (frame as number) / durationFrames) * 100
    : 0;

  /* Playback controls */
  const handlePlayPause = useCallback(() => {
    if (engine.playbackEngine) {
      if (isPlaying) engine.playbackEngine.pause();
      else engine.playbackEngine.play();
    }
  }, [isPlaying, engine]);

  const handleSeekStart = useCallback(() => {
    engine.seekTo(toFrame(0));
  }, [engine]);

  const handleSeekEnd = useCallback(() => {
    engine.seekTo(toFrame(Math.max(0, durationFrames - 1)));
  }, [durationFrames, engine]);

  const handleStepBack = useCallback(() => {
    engine.seekTo(toFrame(Math.max(0, (frame as number) - 1)));
  }, [frame, engine]);

  const handleStepForward = useCallback(() => {
    engine.seekTo(toFrame(Math.min(durationFrames - 1, (frame as number) + 1)));
  }, [frame, durationFrames, engine]);

  const handleSkipBack = useCallback(() => {
    engine.seekTo(toFrame(Math.max(0, (frame as number) - fps)));
  }, [frame, fps, engine]);

  const handleSkipForward = useCallback(() => {
    engine.seekTo(toFrame(Math.min(durationFrames - 1, (frame as number) + fps)));
  }, [frame, fps, durationFrames, engine]);

  const handleScrubClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    engine.seekTo(toFrame(Math.round(t * durationFrames)));
  }, [durationFrames, engine]);

  return (
    <div className="workspace-monitor">
      {/* Viewport — black canvas, professional empty state */}
      <div className="monitor-viewport">
        <div className="monitor-empty">
          <div className="monitor-empty-icon">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="1" y="3" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8 20h6M11 16v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M9 9.5l4-2.5v6l-4-2.5z" fill="currentColor" opacity="0.5" />
            </svg>
          </div>
          <span className="monitor-empty-label">No media source</span>
        </div>
      </div>

      {/* Progress / scrub bar */}
      <div className="monitor-scrubber">
        <span className="transport-timecode">{tc(frame as number, fps)}</span>
        <div className="scrubber-bar" onClick={handleScrubClick}>
          <div className="scrubber-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="transport-duration">{tc(durationFrames, fps)}</span>
      </div>

      {/* Transport row */}
      <div className="monitor-transport">
        {/* Left: timecode */}
        <div className="transport-meta">
          <span
            className="transport-timecode"
            style={{ fontSize: 12, color: 'var(--text-primary)', minWidth: 106 }}
          >
            {tc(frame as number, fps)}
          </span>
        </div>

        {/* Center: transport controls */}
        <div className="transport-group">
          <button
            className="transport-btn"
            title="Go to start (Home)"
            onClick={handleSeekStart}
          >
            <StepBack size={13} />
          </button>
          <button
            className="transport-btn"
            title="Skip back 1 second"
            onClick={handleSkipBack}
          >
            <SkipBack size={13} />
          </button>
          <button
            className="transport-btn"
            title="Step back 1 frame (←)"
            onClick={handleStepBack}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M8 3L4 6.5L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="3" y1="3" x2="3" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <button
            className={`transport-btn transport-btn--play${isPlaying ? ' playing' : ''}`}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            onClick={handlePlayPause}
          >
            {isPlaying
              ? <Pause size={13} fill="currentColor" />
              : <Play size={13} fill="currentColor" style={{ marginLeft: 1 }} />
            }
          </button>

          <button
            className="transport-btn"
            title="Step forward 1 frame (→)"
            onClick={handleStepForward}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M5 3l4 3.5L5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="10" y1="3" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button
            className="transport-btn"
            title="Skip forward 1 second"
            onClick={handleSkipForward}
          >
            <SkipForward size={13} />
          </button>
          <button
            className="transport-btn"
            title="Go to end (End)"
            onClick={handleSeekEnd}
          >
            <StepForward size={13} />
          </button>
        </div>

        {/* Right: volume + meta */}
        <div className="transport-meta">
          <button className="transport-vol-btn" title="Volume">
            <Volume2 size={13} />
          </button>
          <span className="transport-duration">{durationFrames}f @ {fps}fps</span>
        </div>
      </div>
    </div>
  );
}

function tc(frames: number, fps: number): string {
  const totalSecs = Math.floor(frames / fps);
  const f = frames % fps;
  const s = totalSecs % 60;
  const m = Math.floor(totalSecs / 60) % 60;
  const h = Math.floor(totalSecs / 3600);
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

function pad(n: number): string {
  return String(Math.max(0, n)).padStart(2, '0');
}
