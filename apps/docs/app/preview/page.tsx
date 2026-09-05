'use client';

import { useState, useEffect, useRef } from 'react';
import {
  TimelineToolbarV3,
  TimelineRulerV3,
  TimelineEmptyState,
} from '@timelinx/ui';

export default function PreviewPage() {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [activePage, setActivePage] = useState('page-1');
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const fps = 30;
  // 7 seconds duration = 210 frames
  const duration = 210;
  // ppf so 7 seconds fits comfortably across the view
  const ppf = 14 * zoom;

  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const deltaSec = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setCurrentTime((prev) => {
        const next = prev + deltaSec * fps;
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, duration, fps]);

  const handleSeek = (frame: number) => {
    setCurrentTime(Math.max(0, Math.min(duration, frame)));
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0e0e12',
        color: '#ffffff',
        fontFamily: "'Inter', 'Roboto', ui-sans-serif, sans-serif",
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: '980px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
          Timelinx UI V3 — Toolbar &amp; Timeruler
        </h1>
        <p style={{ fontSize: '13px', color: '#8a8a9e', margin: 0 }}>
          High-contrast color hierarchy, standard M:SS time increments (0:00 to 0:07) with half-second dots,
          and solid white playhead with geometric flat-topped tab handle.
        </p>
      </div>

      {/* Visual Container */}
      <div
        style={{
          width: '100%',
          maxWidth: '980px',
          background: '#16161c',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Main Control Bar (Toolbar V3) */}
        <TimelineToolbarV3
          currentTime={Math.round(currentTime)}
          duration={duration}
          fps={fps}
          isPlaying={isPlaying}
          onPlayPause={() => {
            if (currentTime >= duration) setCurrentTime(0);
            setIsPlaying((p) => !p);
          }}
          onSkipBack={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          onSkipForward={() => {
            setIsPlaying(false);
            setCurrentTime(duration);
          }}
          pages={[
            { id: 'page-1', name: 'Page 1' },
            { id: 'page-2', name: 'Page 2' },
          ]}
          activePage={activePage}
          onPageChange={setActivePage}
          zoom={zoom}
          zoomMin={0.5}
          zoomMax={2.5}
          onZoomChange={setZoom}
          onZoomFit={() => {
            setZoom(1);
            setCurrentTime(0);
          }}
        />

        {/* Horizontal Track positioned directly below the main control bar */}
        <TimelineRulerV3
          fps={fps}
          ppf={ppf}
          duration={duration}
          currentTime={currentTime}
          onSeek={handleSeek}
          height={28}
          minVisibleSeconds={7}
        />

        {/* Track / Workspace Area */}
        <div
          style={{
            position: 'relative',
            height: '240px',
            background: '#121217',
            overflow: 'hidden',
          }}
        >
          {/* Vertical Playhead line through track area */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${currentTime * ppf}px`,
              width: '1.5px',
              background: '#ffffff',
              boxShadow: '0 0 6px rgba(255, 255, 255, 0.4)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />

          {/* Empty State placeholder */}
          <TimelineEmptyState
            onClick={() => alert('Upload Media clicked')}
          />
        </div>
      </div>

      {/* Feature Explanations & Inspection Badges */}
      <div
        style={{
          width: '100%',
          maxWidth: '980px',
          marginTop: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
        }}
      >
        <div
          style={{
            padding: '16px',
            background: '#16161c',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>
            Primary Color Hierarchy
          </div>
          <div style={{ fontSize: '12px', color: '#8a8a9e', lineHeight: 1.5 }}>
            <strong style={{ color: '#ffffff' }}>Page 1</strong>, the main{' '}
            <strong style={{ color: '#ffffff' }}>0:00 / 0:00</strong> counter, and{' '}
            <strong style={{ color: '#ffffff' }}>Fit</strong> are rendered in solid white (
            <code style={{ color: '#ffffff' }}>#ffffff</code>) to draw primary focus.
          </div>
        </div>

        <div
          style={{
            padding: '16px',
            background: '#16161c',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>
            Secondary Markers &amp; Dots
          </div>
          <div style={{ fontSize: '12px', color: '#8a8a9e', lineHeight: 1.5 }}>
            Full seconds (0:00 to 0:07) labeled in muted grey. A subtle grey dot sits exactly at each
            half-second mark (0.5s, 1.5s, 2.5s, etc.) between numbers.
          </div>
        </div>

        <div
          style={{
            padding: '16px',
            background: '#16161c',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>
            Geometric Playhead Handle
          </div>
          <div style={{ fontSize: '12px', color: '#8a8a9e', lineHeight: 1.5 }}>
            Topped with a geometric, flat-topped tab handle with straight vertical sides and pointed apex
            aligning with the solid white vertical line.
          </div>
        </div>
      </div>
    </main>
  );
}
