import React, { useEffect, useRef, useState } from 'react';
import type { TimelineEngine } from '@timelinx/react';
import { usePlayheadFrame, useIsPlaying, useTimelineWithEngine } from '@timelinx/react';
import { Film, Play, Pause, SkipBack, SkipForward, Maximize2, Volume2 } from 'lucide-react';
import { toFrame } from '@timelinx/core';

interface ViewerProps {
  engine: TimelineEngine;
}

export function Viewer({ engine }: ViewerProps) {
  const frame = usePlayheadFrame(engine);
  const isPlaying = useIsPlaying(engine);
  const timeline = useTimelineWithEngine(engine);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fps = timeline?.fps ?? 30;
  const durationFrames = timeline?.duration ?? 0;
  const currentTimecode = formatTimecode(frame, fps);

  const progress = durationFrames > 0 ? ((frame as number) / durationFrames) * 100 : 0;

  const handlePlayPause = () => {
    if (isPlaying) {
      engine.playbackEngine?.pause();
    } else {
      engine.playbackEngine?.play();
    }
  };

  const handleSkipBack = () => {
    const newFrame = Math.max(0, (frame as number) - fps);
    engine.seekTo(toFrame(newFrame));
  };

  const handleSkipForward = () => {
    const newFrame = Math.min(durationFrames - 1, (frame as number) + fps);
    engine.seekTo(toFrame(newFrame));
  };

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#0a0a0e',
        position: 'relative',
        minHeight: 0,
        overflow: 'hidden',
        padding: 20,
        gap: 16,
      }}
    >
      {/* Preview Canvas */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: '#121218',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.04)',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <video
          ref={videoRef}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            display: 'none',
          }}
        />

        {/* Empty State */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          color: 'rgba(255,255,255,0.15)',
        }}>
          <div style={{
            width: 80,
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 20,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <Film size={36} strokeWidth={1.5} />
          </div>
          <div style={{
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 6,
              color: 'rgba(255,255,255,0.25)',
            }}>
              {isPlaying ? 'Playing' : 'Nothing to preview'}
            </div>
            <div style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.12)',
            }}>
              Import media files to get started
            </div>
          </div>
        </div>

        {/* Timecode Overlay - Top Left */}
        <div style={{
          position: 'absolute',
          top: 14,
          left: 14,
          padding: '6px 12px',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
          borderRadius: 8,
          fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '0.06em',
          color: 'rgba(255,255,255,0.8)',
        }}>
          {currentTimecode}
        </div>

        {/* Resolution Badge - Top Right */}
        <div style={{
          position: 'absolute',
          top: 14,
          right: 14,
          padding: '5px 10px',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
          borderRadius: 6,
          fontSize: 10,
          fontWeight: 500,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.04em',
        }}>
          1920 × 1080
        </div>
      </div>

      {/* Playback Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <button
          onClick={handleSkipBack}
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10,
            color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
          }}
          title="Previous Frame"
        >
          <SkipBack size={16} />
        </button>

        <button
          onClick={handlePlayPause}
          style={{
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            border: 'none',
            borderRadius: 14,
            color: '#000000',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)';
          }}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />}
        </button>

        <button
          onClick={handleSkipForward}
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10,
            color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
          }}
          title="Next Frame"
        >
          <SkipForward size={16} />
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
        padding: '0 8px',
      }}>
        <span style={{
          fontSize: 11,
          fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          color: 'rgba(255,255,255,0.45)',
          minWidth: 82,
          letterSpacing: '0.04em',
        }}>
          {currentTimecode}
        </span>

        <div style={{
          flex: 1,
          height: 4,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 2,
          overflow: 'hidden',
          cursor: 'pointer',
        }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percent = x / rect.width;
            const newFrame = Math.round(percent * durationFrames);
            engine.seekTo(toFrame(newFrame));
          }}
        >
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'var(--tl-playhead-color, #6366f1)',
            borderRadius: 2,
            transition: 'width 16ms linear',
          }} />
        </div>

        <span style={{
          fontSize: 11,
          fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          color: 'rgba(255,255,255,0.3)',
          minWidth: 82,
          textAlign: 'right',
          letterSpacing: '0.04em',
        }}>
          {formatTimecode(durationFrames, fps)}
        </span>

        <button
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 6,
            color: 'rgba(255,255,255,0.3)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
          }}
          title="Volume"
        >
          <Volume2 size={14} />
        </button>
      </div>
    </div>
  );
}

function formatTimecode(frame: number, fps: number): string {
  const totalSeconds = Math.floor(frame / fps);
  const f = frame % fps;
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}
