/**
 * Canvas Compositor — Phase 11
 *
 * Canvas2D-based multi-layer compositor that renders video, image,
 * and text clips with transforms and effects. Replaces the single-
 * <video> MediaPreview from Phase 10.
 */
import React, { useRef, useEffect, useCallback } from 'react';
import { usePlayheadFrame, useIsPlaying } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import { useMediaAssets } from '../context/media-assets-context';
import type { TimelineEngine } from '@timelinx/react';
import type {
  TimelineState,
  Clip,
  Track,
  ClipTransform,
  Effect,
  Asset,
  GeneratorAsset,
  FileAsset,
} from '@timelinx/core';
import { resolveFrame, toFrame } from '@timelinx/core';
import type { ResolvedLayer } from '@timelinx/core';

// ---------------------------------------------------------------------------
// Effect → ctx.filter mapping
// ---------------------------------------------------------------------------

function buildFilterString(effects: readonly Effect[]): string {
  const parts: string[] = [];
  for (const fx of effects) {
    if (!fx.enabled) continue;
    const getParam = (key: string, fallback: number): number => {
      const p = fx.params.find((pp) => pp.key === key);
      return typeof p?.value === 'number' ? p.value : fallback;
    };
    switch (fx.effectType) {
      case 'blur':
        parts.push(`blur(${getParam('intensity', 0)}px)`);
        break;
      case 'brightness':
        parts.push(`brightness(${getParam('intensity', 1)})`);
        break;
      case 'contrast':
        parts.push(`contrast(${getParam('intensity', 1)})`);
        break;
      case 'saturation':
        parts.push(`saturate(${getParam('intensity', 1)})`);
        break;
      case 'hueRotate':
        parts.push(`hue-rotate(${getParam('intensity', 0)}deg)`);
        break;
      // colorCorrect and other types: no clean canvas filter mapping — gap
      default:
        break;
    }
  }
  return parts.length > 0 ? parts.join(' ') : 'none';
}

// ---------------------------------------------------------------------------
// Media element pool — caches <video> and <img> elements by clip ID
// ---------------------------------------------------------------------------

class MediaElementPool {
  private videoElements = new Map<string, HTMLVideoElement>();
  private imageElements = new Map<string, HTMLImageElement>();
  private imageLoaded = new Map<string, boolean>();
  private videoSrcMap = new Map<string, string>();
  private imageSrcMap = new Map<string, string>();

  getVideo(clipId: string, src: string): HTMLVideoElement {
    let video = this.videoElements.get(clipId);
    if (!video) {
      video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.style.display = 'none';
      document.body.appendChild(video);
      this.videoElements.set(clipId, video);
    }
    if (this.videoSrcMap.get(clipId) !== src) {
      video.src = src;
      video.load();
      this.videoSrcMap.set(clipId, src);
    }
    return video;
  }

  getImage(clipId: string, src: string): HTMLImageElement {
    let img = this.imageElements.get(clipId);
    if (!img) {
      img = new Image();
      this.imageElements.set(clipId, img);
      this.imageLoaded.set(clipId, false);
    }
    if (this.imageSrcMap.get(clipId) !== src) {
      this.imageLoaded.set(clipId, false);
      img.src = src;
      this.imageSrcMap.set(clipId, src);
      img.onload = () => this.imageLoaded.set(clipId, true);
    }
    return img;
  }

  isImageReady(clipId: string): boolean {
    return this.imageLoaded.get(clipId) === true;
  }

  destroy(): void {
    for (const video of this.videoElements.values()) {
      video.pause();
      video.src = '';
      video.remove();
    }
    this.videoElements.clear();
    this.videoSrcMap.clear();
    for (const img of this.imageElements.values()) {
      img.src = '';
    }
    this.imageElements.clear();
    this.imageLoaded.clear();
    this.imageSrcMap.clear();
  }
}

// ---------------------------------------------------------------------------
// Canvas compositor render logic
// ---------------------------------------------------------------------------

export interface CompositorRenderOptions {
  canvas: HTMLCanvasElement;
  engine: TimelineEngine;
  mediaAssets: ReturnType<typeof useMediaAssets>;
  pool: MediaElementPool;
  lastSeekRef: Map<string, number>;
}

/**
 * Resolve the source URL for an asset.
 * Prefers blob URL from media assets context, falls back to filePath.
 */
function resolveAssetSrc(
  asset: Asset,
  mediaAssets: CompositorRenderOptions['mediaAssets'],
): string | null {
  if (asset.kind === 'generator') return null;
  const blobUrl = mediaAssets.getBlobUrl(asset.id as string);
  if (blobUrl) return blobUrl;
  const fileAsset = asset as FileAsset;
  return fileAsset.filePath || null;
}

function isImageSource(asset: FileAsset, mediaAssets: CompositorRenderOptions['mediaAssets']): boolean {
  const file = mediaAssets.getFile(asset.id as string);
  if (file?.type.startsWith('image/')) return true;
  return /\.(avif|bmp|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(asset.filePath);
}

/**
 * Get the media-space time (seconds) for a clip at a given timeline frame.
 */
function clipMediaTime(clip: Clip, timelineFrame: number, fps: number): number {
  const mediaIn = (clip.mediaIn ?? 0) as number;
  const timelineStart = clip.timelineStart as number;
  return (timelineFrame - timelineStart + mediaIn) / fps;
}

/**
 * Apply clip transform to the canvas context.
 * Translates, rotates, scales around the anchor point, then draws.
 */
function applyTransform(
  ctx: CanvasRenderingContext2D,
  transform: ClipTransform,
  canvasW: number,
  canvasH: number,
): void {
  const px = transform.positionX.value;
  const py = transform.positionY.value;
  const sx = transform.scaleX.value;
  const sy = transform.scaleY.value;
  const rot = transform.rotation.value;
  const ax = transform.anchorX.value;
  const ay = transform.anchorY.value;

  // Move to the center of the canvas + position offset
  ctx.translate(canvasW / 2 + px, canvasH / 2 + py);

  // Rotate (convert degrees to radians)
  if (rot !== 0) {
    ctx.rotate((rot * Math.PI) / 180);
  }

  // Scale
  if (sx !== 1 || sy !== 1) {
    ctx.scale(sx, sy);
  }

  // Anchor offset
  if (ax !== 0 || ay !== 0) {
    ctx.translate(-ax, -ay);
  }
}

/**
 * Find the clip and track for a given clip ID from the timeline state.
 */
function findClipAndTrack(
  state: TimelineState,
  clipId: string,
): { clip: Clip; track: Track } | null {
  for (const track of state.timeline.tracks) {
    for (const clip of track.clips) {
      if ((clip.id as string) === clipId) {
        return { clip, track };
      }
    }
  }
  return null;
}

/**
 * Render all visible layers onto the canvas for the given frame.
 * This is the core compositing function.
 */
export function renderCompositorFrame(
  options: CompositorRenderOptions,
  frame: number,
  _debugFrameCount?: number,
): void {
  const { canvas, engine, mediaAssets, pool, lastSeekRef } = options;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const state = engine.getState();
  const fps = (state.timeline.fps as number) || 30;
  const canvasW = canvas.width;
  const canvasH = canvas.height;

  // Clear to black
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Resolve all visible layers at this frame
  const resolved = resolveFrame(
    state,
    toFrame(frame),
    'full',
    { width: canvasW, height: canvasH },
  );

  // Draw layers bottom-to-top (trackIndex order — already sorted by resolveFrame)
  for (const layer of resolved.layers) {
    renderLayer(ctx, layer, state, mediaAssets, pool, lastSeekRef, canvasW, canvasH, fps, frame, _debugFrameCount);
  }
}

function renderLayer(
  ctx: CanvasRenderingContext2D,
  layer: ResolvedLayer,
  state: TimelineState,
  mediaAssets: CompositorRenderOptions['mediaAssets'],
  pool: MediaElementPool,
  lastSeekRef: Map<string, number>,
  canvasW: number,
  canvasH: number,
  fps: number,
  currentFrame: number,
  _debugFrameCount?: number,
): void {
  const found = findClipAndTrack(state, layer.clipId as string);
  if (!found) return;
  const { clip, track } = found;

  const asset = state.assetRegistry.get(clip.assetId);
  if (!asset) return;

  // Build filter from effects
  const filterStr = buildFilterString(layer.effects);

  // Save context state
  ctx.save();

  // Set global alpha from track opacity * clip transform opacity
  const trackOpacity = layer.opacity;
  const transformOpacity = layer.transform.opacity.value;
  ctx.globalAlpha = Math.max(0, Math.min(1, trackOpacity * transformOpacity));

  // Apply filter
  if (filterStr !== 'none') {
    ctx.filter = filterStr;
  }

  // Apply transform
  ctx.save();
  applyTransform(ctx, layer.transform, canvasW, canvasH);

  if (asset.kind === 'generator') {
    renderGenerator(ctx, asset as GeneratorAsset, canvasW, canvasH);
  } else {
    const src = resolveAssetSrc(asset, mediaAssets);
    if (!src) {
      ctx.restore();
      ctx.restore();
      return;
    }

    const fileAsset = asset as FileAsset;
    if (isImageSource(fileAsset, mediaAssets)) {
      renderImage(ctx, pool, clip.id as string, src, canvasW, canvasH);
    } else if (fileAsset.mediaType === 'video') {
      renderVideo(ctx, clip, pool, clip.id as string, src, canvasW, canvasH, fps, currentFrame, lastSeekRef, _debugFrameCount);
    } else if (fileAsset.mediaType === 'audio') {
      // Audio clips have no visual representation — skip
    }
  }

  ctx.restore(); // transform
  ctx.restore(); // globalAlpha + filter
}

function renderVideo(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  pool: MediaElementPool,
  clipId: string,
  src: string,
  canvasW: number,
  canvasH: number,
  fps: number,
  currentFrame: number,
  lastSeekRef: Map<string, number>,
  _debugFrameCount?: number,
): void {
  const video = pool.getVideo(clipId, src);
  const targetTime = clipMediaTime(clip, currentFrame, fps);

  // Seek if needed (avoid redundant seeks)
  const lastSeek = lastSeekRef.get(clipId) ?? -1;
  if (Math.abs(targetTime - lastSeek) > 0.02 && targetTime >= 0) {
    video.currentTime = targetTime;
    lastSeekRef.set(clipId, targetTime);
  }

  if (_debugFrameCount !== undefined && _debugFrameCount <= 3) {
    console.log('[EXPORT-DEBUG]   renderVideo clip:', clipId, 'targetTime:', targetTime.toFixed(3), 'readyState:', video.readyState, 'videoWidth:', video.videoWidth, 'videoHeight:', video.videoHeight, 'src:', src?.substring(0, 80));
  }

  // Draw the video frame (may be stale if seek hasn't completed — acceptable for real-time)
  if (video.readyState >= 2) {
    // Scale video to fit canvas while maintaining aspect ratio (contain)
    const vw = video.videoWidth || canvasW;
    const vh = video.videoHeight || canvasH;
    const scale = Math.min(canvasW / vw, canvasH / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    const dx = (canvasW - dw) / 2;
    const dy = (canvasH - dh) / 2;
    ctx.drawImage(video, dx, dy, dw, dh);
  }
}

function renderImage(
  ctx: CanvasRenderingContext2D,
  pool: MediaElementPool,
  clipId: string,
  src: string,
  canvasW: number,
  canvasH: number,
): void {
  const img = pool.getImage(clipId, src);
  if (!pool.isImageReady(clipId)) return;

  // Scale image to fit canvas (contain)
  const iw = img.naturalWidth || canvasW;
  const ih = img.naturalHeight || canvasH;
  const scale = Math.min(canvasW / iw, canvasH / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (canvasW - dw) / 2;
  const dy = (canvasH - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function renderGenerator(
  ctx: CanvasRenderingContext2D,
  asset: GeneratorAsset,
  canvasW: number,
  canvasH: number,
): void {
  const gen = asset.generatorDef;
  if (gen.type === 'text') {
    const text = (gen.params as Record<string, unknown>).text as string ?? '';
    if (!text) return;

    const fontSize = Math.max(24, Math.min(72, canvasH * 0.06));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shadow for readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#ffffff';

    // Word-wrap
    const maxWidth = canvasW * 0.8;
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = fontSize * 1.3;
    const totalHeight = lines.length * lineHeight;
    const startY = (canvasH - totalHeight) / 2 + lineHeight / 2;

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i]!, canvasW / 2, startY + i * lineHeight);
    }

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
}

// ---------------------------------------------------------------------------
// React component — CompositorPreview
// ---------------------------------------------------------------------------

export interface CompositorPreviewProps {
  className?: string;
}

export const CompositorPreview = React.memo(function CompositorPreview({
  className,
}: CompositorPreviewProps) {
  const { engine } = useTimelineContext();
  const mediaAssets = useMediaAssets();
  const frame = usePlayheadFrame(engine);
  const isPlaying = useIsPlaying(engine);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poolRef = useRef<MediaElementPool>(new MediaElementPool());
  const lastSeekRef = useRef<Map<string, number>>(new Map());
  const rafRef = useRef<number>(0);
  const frameRef = useRef<number>(frame as number);
  frameRef.current = frame as number;

  const canvasW = 1920;
  const canvasH = 1080;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      poolRef.current.destroy();
    };
  }, []);

  // Build the render options once (stable refs)
  const renderOptsRef = useRef<CompositorRenderOptions | null>(null);
  renderOptsRef.current = {
    canvas: canvasRef.current!,
    engine,
    mediaAssets,
    pool: poolRef.current,
    lastSeekRef: lastSeekRef.current,
  };

  // Render function — reads current frame from ref for rAF loop
  const doRender = useCallback(() => {
    const opts = renderOptsRef.current;
    if (!opts?.canvas) return;
    renderCompositorFrame(opts, frameRef.current);
  }, []);

  // During playback: rAF loop
  useEffect(() => {
    if (isPlaying) {
      const tick = () => {
        doRender();
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    } else {
      // When paused, render once on frame change (scrubbing)
      doRender();
    }
  }, [isPlaying, doRender, frame]);

  return (
    <div className={`media-preview${className ? ` ${className}` : ''}`}>
      <canvas
        ref={canvasRef}
        width={canvasW}
        height={canvasH}
        className="media-preview-video"
      />
    </div>
  );
});

export { MediaElementPool, renderCompositorFrame as renderFrame };
