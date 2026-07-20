/**
 * Media Preview — Phase 10
 *
 * Renders a real <video> element in the preview area, bound to the
 * current playhead position. When a video clip is under the playhead,
 * shows the real video frame. Falls back to the default gradient
 * background when no real video is active.
 */
import React, { useRef, useEffect, useMemo } from 'react';
import { usePlayheadFrame, useTimelineWithEngine } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import { useMediaAssets } from '../context/media-assets-context';
import type { Clip } from '@timelinx/core';

function findTopVideoClipAtFrame(
  engine: ReturnType<typeof useTimelineContext>['engine'],
  frame: number,
): { clip: Clip; assetFilePath: string } | null {
  const state = engine.getState();
  const tracks = state.timeline.tracks;
  const registry = state.assetRegistry;

  for (let i = tracks.length - 1; i >= 0; i--) {
    const track = tracks[i]!;
    if (track.type !== 'video') continue;
    for (const clip of track.clips) {
      const start = clip.timelineStart as number;
      const end = clip.timelineEnd as number;
      if (frame >= start && frame < end) {
        const asset = registry.get(clip.assetId);
        if (asset && asset.kind === 'file' && asset.filePath) {
          return { clip, assetFilePath: asset.filePath };
        }
      }
    }
  }
  return null;
}

export interface MediaPreviewProps {
  className?: string;
}

export const MediaPreview = React.memo(function MediaPreview({
  className,
}: MediaPreviewProps) {
  const { engine } = useTimelineContext();
  const mediaAssets = useMediaAssets();
  const frame = usePlayheadFrame(engine);
  const timeline = useTimelineWithEngine(engine);
  const fps = (timeline?.fps as number) || 30;

  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSeekRef = useRef<number>(-1);

  const activeClipInfo = useMemo(
    () => findTopVideoClipAtFrame(engine, frame as number),
    [engine, frame],
  );

  const isRealVideo = activeClipInfo !== null;

  useEffect(() => {
    if (!videoRef.current || !activeClipInfo) return;

    const video = videoRef.current;
    const { clip, assetFilePath } = activeClipInfo;
    const src = assetFilePath;

    if (video.src !== src) {
      video.src = src;
      video.load();
    }

    const mediaIn = (clip.mediaIn ?? 0) as number;
    const timelineStart = clip.timelineStart as number;
    const targetTime = ((frame as number) - timelineStart + mediaIn) / fps;

    if (Math.abs(targetTime - lastSeekRef.current) > 0.02) {
      video.currentTime = targetTime;
      lastSeekRef.current = targetTime;
    }
  }, [frame, activeClipInfo, fps]);

  return (
    <div className={`media-preview${className ? ` ${className}` : ''}`}>
      <video
        ref={videoRef}
        className="media-preview-video"
        muted
        playsInline
        preload="auto"
        style={{ display: isRealVideo ? 'block' : 'none' }}
      />
    </div>
  );
});
