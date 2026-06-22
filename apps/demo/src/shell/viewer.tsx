import React, { useEffect, useRef } from 'react';
import type { TimelineEngine } from '@webpacked-timeline/react';
import { usePlayheadFrame, useIsPlaying } from '@webpacked-timeline/react';
import { toAssetId, toFrame } from '@webpacked-timeline/core';
import type { Clip } from '@webpacked-timeline/core';
import { MEDIA_ASSETS } from '../mock-data';
import type { Asset } from '@webpacked-timeline/core';

const FPS = 30;

function getClipAtFrame(engine: TimelineEngine, frame: number): Clip | null {
  const state = engine.getState();
  const ordered = [...state.timeline.tracks].sort((a, b) => {
    if (a.type === b.type) return 0;
    return a.type === 'video' ? -1 : 1;
  });
  for (const track of ordered) {
    for (const clip of track.clips) {
      if (
        frame >= (clip.timelineStart as number) &&
        frame < (clip.timelineEnd as number)
      ) {
        return clip;
      }
    }
  }
  return null;
}

function getClipColor(clip: Clip): string {
  const assetDef = MEDIA_ASSETS.find((a) => a.id === (clip.assetId as string));
  return assetDef?.color ?? '#151518';
}

function frameToTimecode(frame: number, fps: number): string {
  const totalSeconds = Math.floor(frame / fps);
  const f = Math.round(frame % fps);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

// ── Angular transport icons ──────────────────────────────────────────

function IconSkipBack({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
      <polygon points="12,4 2,12 12,20" />
      <polygon points="22,4 12,12 22,20" />
    </svg>
  );
}

function IconRewind({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
      <polygon points="12,4 2,12 12,20" />
      <polygon points="22,4 12,12 22,20" />
    </svg>
  );
}

function IconStepBack({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
      <polygon points="20,4 8,12 20,20" />
      <line x1="4" y1="4" x2="4" y2="20" />
    </svg>
  );
}

function IconPlay({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="7,4 20,12 7,20" />
    </svg>
  );
}

function IconPause({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="5" y="4" width="4" height="16" />
      <rect x="15" y="4" width="4" height="16" />
    </svg>
  );
}

function IconStepForward({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
      <polygon points="4,4 16,12 4,20" />
      <line x1="20" y1="4" x2="20" y2="20" />
    </svg>
  );
}

function IconFastForward({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
      <polygon points="2,4 12,12 2,20" />
      <polygon points="12,4 22,12 12,20" />
    </svg>
  );
}

function IconSkipForward({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
      <polygon points="2,4 12,12 2,20" />
      <polygon points="12,4 22,12 12,20" />
    </svg>
  );
}

function LogoMark() {
  return (
    <svg width="32" height="24" viewBox="0 0 20 16" fill="none" style={{ opacity: 0.08 }}>
      <rect x="0" y="2" width="14" height="4" fill="#d4a84a" />
      <rect x="0" y="10" width="20" height="4" fill="#d4a84a" opacity="0.4" />
    </svg>
  );
}

export function Viewer({ engine }: { engine: TimelineEngine }) {
  const currentFrame = usePlayheadFrame(engine);
  const isPlaying = useIsPlaying(engine);
  const mediaRef = useRef<HTMLMediaElement | null>(null);

  const frame = currentFrame as number;
  const clip = getClipAtFrame(engine, frame);
  const state = engine.getState();
  const durationFrames = (state.timeline.duration as number) || 1;
  const asset = clip
    ? state.assetRegistry.get(toAssetId(clip.assetId as string)) as Asset | undefined
    : undefined;
  const fileAsset = asset?.kind === 'file' ? asset : undefined;
  const hasRealMedia = !!fileAsset && !fileAsset.filePath.startsWith('generator://');
  const isImage = !!fileAsset && /\.(svg|png|jpe?g|gif|webp|avif)$/i.test(fileAsset.name + fileAsset.filePath);

  let previewStyle: React.CSSProperties = {};
  if (clip) {
    const color = getClipColor(clip);
    previewStyle = {
      background: `radial-gradient(ellipse at 50% 45%, ${color}, #0a0a0c)`,
    };
  } else {
    previewStyle = { background: '#0a0a0c' };
  }

  useEffect(() => {
    const el = mediaRef.current;
    if (!el || !clip) return;
    const fps = FPS;
    const clipStart = clip.timelineStart as number;
    const mediaIn = clip.mediaIn as number;
    const mediaTimeSec = (frame - clipStart + mediaIn) / fps;
    try {
      if (Math.abs(el.currentTime - mediaTimeSec) > 0.12) el.currentTime = Math.max(0, mediaTimeSec);
    } catch (_) {}
    if (isPlaying) { el.play().catch(() => {}); } else { el.pause(); }
  }, [frame, clip, isPlaying]);

  const handlePlay = () => {
    const pb = engine.playbackEngine;
    if (!pb) return;
    if (isPlaying) { pb.pause(); } else { pb.play(); }
    engine.seekTo(engine.getPlayheadFrame());
  };

  const handleSeekStart = () => engine.seekTo(toFrame(0));
  const handleSeekEnd = () => engine.seekTo(toFrame(durationFrames - 1));
  const handleRewind = () => engine.seekTo(toFrame(Math.max(0, frame - FPS * 5)));
  const handleFastForward = () => engine.seekTo(toFrame(Math.min(durationFrames - 1, frame + FPS * 5)));
  const handleStepBack = () => engine.seekTo(toFrame(Math.max(0, frame - 1)));
  const handleStepForward = () => engine.seekTo(toFrame(Math.min(durationFrames - 1, frame + 1)));

  return (
    <div className="demo-viewer">
      <div className="demo-viewer-preview" style={previewStyle}>
        {clip && hasRealMedia && fileAsset ? (
          isImage ? (
            <img className="demo-viewer-media" src={fileAsset.filePath} alt={fileAsset.name} />
          ) : fileAsset.mediaType === 'video' ? (
            <video ref={mediaRef as React.RefObject<HTMLVideoElement>} className="demo-viewer-media" src={fileAsset.filePath} preload="auto" playsInline />
          ) : (
            <div className="demo-viewer-audio">
              <div className="demo-audio-meter" aria-hidden="true">
                {Array.from({ length: 28 }, (_, i) => <i key={i} style={{ height: `${20 + ((i * 31) % 70)}%` }} />)}
              </div>
              <div className="demo-viewer-clip-name">{fileAsset.name}</div>
              <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} src={fileAsset.filePath} preload="auto" />
            </div>
          )
        ) : clip ? (
          <>
            <div className="demo-viewer-clip-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square" strokeLinejoin="miter" style={{ opacity: 0.3 }}>
                <rect x="2" y="2" width="20" height="20" />
                <line x1="7" y1="2" x2="7" y2="22" />
                <line x1="17" y1="2" x2="17" y2="22" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="2" y1="7" x2="7" y2="7" />
                <line x1="2" y1="17" x2="7" y2="17" />
                <line x1="17" y1="7" x2="22" y2="7" />
                <line x1="17" y1="17" x2="22" y2="17" />
              </svg>
            </div>
            <div className="demo-viewer-clip-name">{clip.name}</div>
            <div className="demo-viewer-clip-tc">{frameToTimecode(frame, FPS)}</div>
          </>
        ) : (
          <div className="demo-viewer-empty"><LogoMark /></div>
        )}
      </div>

      <div className="demo-viewer-readout">
        <span>{clip?.name ?? '—'}</span>
        <strong>{frameToTimecode(frame, FPS)}</strong>
      </div>

      <div className="demo-viewer-transport">
        <button className="demo-transport-btn" onClick={handleSeekStart} title="Go to start"><IconSkipBack /></button>
        <button className="demo-transport-btn" onClick={handleRewind} title="Rewind 5s"><IconRewind /></button>
        <button className="demo-transport-btn" onClick={handleStepBack} title="Step back"><IconStepBack /></button>
        <button className={`demo-transport-btn ${isPlaying ? 'is-active' : ''}`} onClick={handlePlay} title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <IconPause /> : <IconPlay />}
        </button>
        <button className="demo-transport-btn" onClick={handleStepForward} title="Step forward"><IconStepForward /></button>
        <button className="demo-transport-btn" onClick={handleFastForward} title="Fast forward 5s"><IconFastForward /></button>
        <button className="demo-transport-btn" onClick={handleSeekEnd} title="Go to end"><IconSkipForward /></button>
      </div>
    </div>
  );
}
