import React from 'react';
import type { TimelineEngine } from '@webpacked-timeline/react';
import { createClip, toClipId, toAssetId, toTrackId, toFrame, createAsset, frameRate } from '@webpacked-timeline/core';
import { MEDIA_ASSETS, formatAssetDuration } from '../mock-data';
import type { MediaAssetDef } from '../mock-data';
import { useState, useRef } from 'react';

const VIDEO_COLORS = [
  '#1a3a52',
  '#1e3040',
  '#1a3548',
  '#1a3840',
  '#1a3d50',
  '#1a3555',
];

const AUDIO_COLORS = [
  '#1a3d2e',
  '#1a3828',
  '#1a3525',
];

let _addCounter = 0;

export function addAssetToTimeline(
  engine: TimelineEngine,
  assetId: string,
  requestedTrackId?: string,
  requestedFrame?: number,
): { trackId: string; frame: number } | null {
  const state = engine.getState();
  const tracks = state.timeline.tracks;
  const asset = state.assetRegistry.get(toAssetId(assetId));
  if (!asset) return null;

  const requestedTrack = tracks.find((t) => t.id === requestedTrackId);
  const targetTrack = requestedTrack?.type === asset.mediaType
    ? requestedTrack
    : tracks.find((t) => t.type === asset.mediaType);
  if (!targetTrack) return null;

  const lastEnd = targetTrack.clips.reduce(
    (max, c) => Math.max(max, c.timelineEnd as number),
    0,
  );

  const maxDuration = asset.intrinsicDuration as number;
  const clipDuration = Math.min(maxDuration, 150);
  let start = requestedFrame ?? lastEnd;
  const sorted = [...targetTrack.clips].sort((a, b) => (a.timelineStart as number) - (b.timelineStart as number));
  for (const existing of sorted) {
    const existingStart = existing.timelineStart as number;
    const existingEnd = existing.timelineEnd as number;
    if (start + clipDuration <= existingStart) break;
    if (start < existingEnd && start + clipDuration > existingStart) start = existingEnd;
  }
  const available = (state.timeline.duration as number) - start;
  const duration = Math.min(clipDuration, available);
  if (duration < 1) return null;
  _addCounter++;
  const clipId = `added-${assetId}-${_addCounter}`;

  const clip = createClip({
    id: toClipId(clipId),
    assetId: toAssetId(assetId),
    trackId: toTrackId(targetTrack.id),
    timelineStart: toFrame(start),
    timelineEnd: toFrame(start + duration),
    mediaIn: toFrame(0),
    mediaOut: toFrame(duration),
    name: asset.name,
  });

  const result = engine.dispatch({
    id: `tx-add-${clipId}`,
    label: `Add ${asset.name}`,
    timestamp: Date.now(),
    operations: [{ type: 'INSERT_CLIP', clip, trackId: toTrackId(targetTrack.id) }],
  });
  if (!result.accepted) return null;
  engine.seekTo(toFrame(start));
  return { trackId: targetTrack.id as string, frame: start };
}

function getMediaDuration(file: File, url: string, fps: number): Promise<number> {
  if (file.type.startsWith('image/')) return Promise.resolve(5 * fps);
  return new Promise((resolve) => {
    const el = document.createElement(file.type.startsWith('audio/') ? 'audio' : 'video');
    const finish = () => resolve(Number.isFinite(el.duration) ? Math.max(1, Math.round(el.duration * fps)) : 5 * fps);
    el.preload = 'metadata';
    el.addEventListener('loadedmetadata', finish, { once: true });
    el.addEventListener('error', () => resolve(5 * fps), { once: true });
    el.src = url;
  });
}

export function MediaPool({ engine }: { engine: TimelineEngine }) {
  const [imported, setImported] = useState<MediaAssetDef[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleImportClick = () => {
    if (!fileRef.current) return;
    fileRef.current.value = '';
    fileRef.current.click();
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setIsImporting(true);
    const fps = 30;
    const next: MediaAssetDef[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      const isAudio = file.type.startsWith('audio/');
      const isImage = file.type.startsWith('image/');
      const intrinsicFrames = await getMediaDuration(file, url, fps);
      const assetId = `import-${Date.now()}-${i}`;

      const asset = createAsset({
        id: assetId,
        name: file.name,
        mediaType: isAudio ? 'audio' : 'video',
        filePath: url,
        intrinsicDuration: toFrame(intrinsicFrames),
        nativeFps: frameRate(fps),
        sourceTimecodeOffset: toFrame(0),
      });

      engine.dispatch({
        id: `tx-register-${assetId}`,
        label: `Register ${file.name}`,
        timestamp: Date.now(),
        operations: [{ type: 'REGISTER_ASSET', asset } as any],
      });

      next.push({
        id: assetId,
        name: file.name,
        duration: intrinsicFrames,
        mediaType: isAudio ? 'audio' : 'video',
        color: isAudio ? AUDIO_COLORS[i % AUDIO_COLORS.length] : VIDEO_COLORS[i % VIDEO_COLORS.length],
        emoji: '',
        filePath: url,
        thumbnailUrl: isImage || file.type.startsWith('video/') ? url : undefined,
        sourceKind: isAudio ? 'audio' : isImage ? 'image' : 'video',
      });
    }
    setImported((s) => [...s, ...next]);
    setIsImporting(false);
  };
  return (
    <div className="demo-media-pool">
      <div className="demo-media-pool-header">
        <span className="demo-media-pool-label">Media Pool</span>
        <button className="demo-media-pool-add-btn" title="Import media" onClick={handleImportClick}>
          +
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*,audio/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div className="demo-media-pool-list">
        {[...MEDIA_ASSETS, ...imported].map((asset, i) => {
          const colorPalette = asset.mediaType === 'video' ? VIDEO_COLORS : AUDIO_COLORS;
          const thumbColor = colorPalette[i % colorPalette.length];

          return (
            <div
              key={asset.id}
              className="demo-media-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('application/x-timeline-asset', asset.id);
                e.dataTransfer.setData('text/plain', asset.name);
              }}
              onDoubleClick={() => addAssetToTimeline(engine, asset.id)}
            >
              <div
                className="demo-media-item-thumb"
                style={{ background: thumbColor }}
              >
                {asset.thumbnailUrl && <img src={asset.thumbnailUrl} alt="" />}
                {!asset.thumbnailUrl && <span>{asset.mediaType === 'audio' ? 'A' : 'V'}</span>}
              </div>
              <div className="demo-media-item-info">
                <span className="demo-media-item-name">
                  {asset.name}
                </span>
                <span className="demo-media-item-duration">
                  {formatAssetDuration(asset.duration)}
                </span>
              </div>
              <button
                className="demo-media-item-add"
                onClick={(e) => {
                  e.stopPropagation();
                  addAssetToTimeline(engine, asset.id);
                }}
              >
                Add
              </button>
            </div>
          );
        })}
      </div>

      <div className="demo-media-pool-hint">
        {isImporting ? 'Reading media metadata...' : 'Drag media onto a compatible track'}
      </div>
    </div>
  );
}
