import {
  createTimelineState,
  createTimeline,
  createTrack,
  createClip,
  createAsset,
  toTrackId,
  toClipId,
  toAssetId,
  toFrame,
  frameRate,
} from '@webpacked-timeline/core';
import type { AssetRegistry, Asset } from '@webpacked-timeline/core';

const fps = 30 as const;
const duration = toFrame(fps * 600); // 10 minutes = 18000 frames

// ── Asset Definitions ──────────────────────────────────────────────────────

export interface MediaAssetDef {
  id: string;
  name: string;
  duration: number; // frames
  mediaType: 'video' | 'audio';
  color: string;
  emoji: string;
  filePath?: string;
  thumbnailUrl?: string;
  sourceKind?: 'image' | 'video' | 'audio';
}

export const MEDIA_ASSETS: MediaAssetDef[] = [
  // Video assets
  { id: 'asset-mountain',   name: 'Mountain Summit',    duration: 2700, mediaType: 'video', color: 'hsl(210 45% 35%)', emoji: '🎬' },
  { id: 'asset-city',       name: 'City Streets',       duration: 2400, mediaType: 'video', color: 'hsl(220 35% 30%)', emoji: '🎬' },
  { id: 'asset-interview',  name: 'Interview - Main',   duration: 5400, mediaType: 'video', color: 'hsl(200 30% 32%)', emoji: '🎬' },
  { id: 'asset-nature',     name: 'B-Roll Nature',      duration: 2700, mediaType: 'video', color: 'hsl(195 40% 28%)', emoji: '🎬' },
  { id: 'asset-aerial',     name: 'Aerial Coastline',   duration: 2400, mediaType: 'video', color: 'hsl(205 50% 33%)', emoji: '🎬' },
  { id: 'asset-sunset',     name: 'Sunset Timelapse',   duration: 1350, mediaType: 'video', color: 'hsl(215 35% 36%)', emoji: '🎬' },
  // Hardcoded sample images (served from demo public/)
  { id: 'asset-sample-1',  name: 'Sample Image 1',    duration: 150, mediaType: 'video', color: 'hsl(210 40% 28%)', emoji: '🖼️', filePath: '/media/sample1.svg' },
  { id: 'asset-sample-2',  name: 'Sample Image 2',    duration: 150, mediaType: 'video', color: 'hsl(200 30% 28%)', emoji: '🖼️', filePath: '/media/sample2.svg' },
  // Audio assets
  { id: 'asset-ambient',    name: 'Ambient Journey',    duration: 7560, mediaType: 'audio', color: 'hsl(160 35% 30%)', emoji: '🎵' },
  { id: 'asset-intaudio',   name: 'Interview Audio',    duration: 5400, mediaType: 'audio', color: 'hsl(150 30% 28%)', emoji: '🎵' },
  { id: 'asset-sfx',        name: 'Atmospheric SFX',    duration: 960,  mediaType: 'audio', color: 'hsl(140 25% 26%)', emoji: '🎵' },
];

/** Formatted durations for display in media pool */
export function formatAssetDuration(frames: number): string {
  const totalSeconds = Math.floor(frames / fps);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}:00`;
}

// ── Build Mock State ───────────────────────────────────────────────────────

export function buildMockState() {
  const assetMap = new Map<string, Asset>();

  function addAsset(def: MediaAssetDef) {
    const asset = createAsset({
      id: def.id,
      name: def.name,
      mediaType: def.mediaType,
      filePath: def.filePath ?? `generator://${def.id}`,
      intrinsicDuration: toFrame(def.duration),
      nativeFps: frameRate(fps),
      sourceTimecodeOffset: toFrame(0),
    });
    assetMap.set(def.id, asset);
  }

  // Register all assets
  for (const def of MEDIA_ASSETS) {
    addAsset(def);
  }

  // ── V1: Primary Edit ──────────────────────────────────────────────────
  const clips_v1 = [
    { id: 'v1-mountain',  asset: 'asset-mountain',  start: 0,    end: 540,  label: 'Mountain Summit' },
    { id: 'v1-city',      asset: 'asset-city',      start: 600,  end: 1500, label: 'City Streets' },
    { id: 'v1-interview', asset: 'asset-interview', start: 1560, end: 3060, label: 'Interview Main' },
    { id: 'v1-nature',    asset: 'asset-nature',    start: 3120, end: 3780, label: 'B-Roll Nature' },
    { id: 'v1-aerial',    asset: 'asset-aerial',    start: 3840, end: 4680, label: 'Aerial Coastline' },
    { id: 'v1-sunset',    asset: 'asset-sunset',    start: 4740, end: 5280, label: 'Sunset Timelapse' },
    { id: 'v1-sample',    asset: 'asset-sample-1',  start: 5400, end: 5550, label: 'Sample Image 1' },
  ].map((c) =>
    createClip({
      id: toClipId(c.id),
      assetId: toAssetId(c.asset),
      trackId: toTrackId('v1'),
      timelineStart: toFrame(c.start),
      timelineEnd: toFrame(c.end),
      mediaIn: toFrame(0),
      mediaOut: toFrame(c.end - c.start),
      name: c.label,
    }),
  );

  // ── V2: B-Roll / Overlays ────────────────────────────────────────────
  const clips_v2 = [
    { id: 'v2-city-b',     asset: 'asset-city',   start: 700,  end: 1200, label: 'City Streets B' },
    { id: 'v2-nature-ins', asset: 'asset-nature', start: 2000, end: 2600, label: 'Nature Insert' },
    { id: 'v2-aerial-ins', asset: 'asset-aerial', start: 3200, end: 3600, label: 'Aerial Insert' },
  ].map((c) =>
    createClip({
      id: toClipId(c.id),
      assetId: toAssetId(c.asset),
      trackId: toTrackId('v2'),
      timelineStart: toFrame(c.start),
      timelineEnd: toFrame(c.end),
      mediaIn: toFrame(0),
      mediaOut: toFrame(c.end - c.start),
      name: c.label,
    }),
  );

  // ── A1: Sync Audio ───────────────────────────────────────────────────
  const clips_a1 = [
    { id: 'a1-intaudio', asset: 'asset-intaudio', start: 1560, end: 3060, label: 'Interview Audio' },
    { id: 'a1-sfx',      asset: 'asset-sfx',      start: 0,    end: 1500, label: 'Atmospheric SFX' },
  ].map((c) =>
    createClip({
      id: toClipId(c.id),
      assetId: toAssetId(c.asset),
      trackId: toTrackId('a1'),
      timelineStart: toFrame(c.start),
      timelineEnd: toFrame(c.end),
      mediaIn: toFrame(0),
      mediaOut: toFrame(c.end - c.start),
      name: c.label,
    }),
  );

  // ── A2: Music ────────────────────────────────────────────────────────
  const clips_a2 = [
    { id: 'a2-ambient', asset: 'asset-ambient', start: 0, end: 5280, label: 'Ambient Journey' },
  ].map((c) =>
    createClip({
      id: toClipId(c.id),
      assetId: toAssetId(c.asset),
      trackId: toTrackId('a2'),
      timelineStart: toFrame(c.start),
      timelineEnd: toFrame(c.end),
      mediaIn: toFrame(0),
      mediaOut: toFrame(c.end - c.start),
      name: c.label,
    }),
  );

  // ── Tracks ───────────────────────────────────────────────────────────
  const v1 = createTrack({ id: 'v1', name: 'V1', type: 'video', clips: clips_v1 });
  const v2 = createTrack({ id: 'v2', name: 'V2', type: 'video', clips: clips_v2 });
  const a1 = createTrack({ id: 'a1', name: 'A1', type: 'audio', clips: clips_a1 });
  const a2 = createTrack({ id: 'a2', name: 'A2', type: 'audio', clips: clips_a2 });

  const timeline = createTimeline({
    id: 'tl-travel-doc',
    name: 'Travel Documentary',
    fps: frameRate(fps),
    duration,
    tracks: [v1, v2, a1, a2],
  });

  return createTimelineState({
    timeline,
    assetRegistry: assetMap as unknown as AssetRegistry,
  });
}
