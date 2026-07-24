import React, { useState, useCallback, useRef, useSyncExternalStore } from 'react';
import { useTimelineContext } from '../context/timeline-context';
import { useMediaAssets } from '../context/media-assets-context';
import { extractMetadata, detectMediaType } from '../utils/media-import';
import type { Asset, AssetId } from '@timelinx/core';
import { createAsset, toFrame, frameRate, toAssetId, createClip } from '@timelinx/core';
import { Upload, Grid3X3, SlidersHorizontal, Filter } from 'lucide-react';

const PLACEHOLDER_GRADIENTS: Record<string, string> = {
  video: 'bin-thumb--interview',
  audio: 'bin-thumb--audio',
  image: 'bin-thumb--graphic',
};

function getPlaceholderClass(mediaType: string, index: number): string {
  const variants: Record<string, string[]> = {
    video: ['bin-thumb--interview', 'bin-thumb--cityscape', 'bin-thumb--hands'],
    audio: ['bin-thumb--audio', 'bin-thumb--voiceover'],
    image: ['bin-thumb--graphic'],
  };
  const list = variants[mediaType] ?? [PLACEHOLDER_GRADIENTS[mediaType] ?? ''];
  return list[index % list.length];
}

export interface AssetBinProps {
  onAssetDrop?: (drop: { assetId: string; trackId: string; frame: number }) => void;
  className?: string;
}

export const AssetBin = React.memo(function AssetBin({
  onAssetDrop,
  className,
}: AssetBinProps) {
  const { engine } = useTimelineContext();
  const mediaAssets = useMediaAssets();
  const [selectedAssetId, setSelectedAssetId] = useState<AssetId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [importErrors, setImportErrors] = useState<Array<{ name: string; message: string }>>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const assetRegistry = useSyncExternalStore(
    engine.subscribe,
    () => engine.getSnapshot().state.assetRegistry,
    () => engine.getSnapshot().state.assetRegistry,
  );
  const state = engine.getState();
  const fps = (state.timeline.fps as number) || 30;
  const assets = Array.from(assetRegistry.values());

  const filteredAssets = searchQuery
    ? assets.filter((asset) =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.mediaType.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : assets;

  const handleAssetClick = useCallback((asset: Asset) => {
    setSelectedAssetId(asset.id);

    const state = engine.getState();
    const tracks = state.timeline.tracks;
    const preferredType = asset.mediaType === 'audio' ? 'audio' : 'video';
    const track = tracks.find((t) => t.type === preferredType) ?? tracks[0];
    if (!track) return;

    const duration = asset.intrinsicDuration as number;
    const frame = engine.getPlayheadFrame() as number;
    const clipId = `clip-${crypto.randomUUID()}`;
    const endFrame = frame + duration;

    const currentDuration = state.timeline.duration as number;
    const newDuration = Math.max(currentDuration, endFrame);

    engine.dispatch({
      id: `add-asset-${clipId}`,
      label: `Add ${asset.name} to timeline`,
      timestamp: Date.now(),
      operations: [
        {
          type: 'INSERT_CLIP',
          trackId: track.id,
          clip: createClip({
            id: clipId,
            assetId: asset.id as string,
            trackId: track.id,
            timelineStart: toFrame(frame),
            timelineEnd: toFrame(endFrame),
            mediaIn: toFrame(0),
            mediaOut: toFrame(duration),
          }),
        },
        ...(newDuration > currentDuration
          ? [{ type: 'SET_TIMELINE_DURATION' as const, duration: toFrame(newDuration) }]
          : []),
      ],
    });
  }, [engine]);

  const handleDragStart = useCallback((e: React.DragEvent, asset: Asset) => {
    e.dataTransfer.setData('application/x-timeline-asset', asset.id as string);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const importFiles = useCallback(async (files: FileList | File[]) => {
    setIsImporting(true);
    setImportErrors([]);
    const errors: Array<{ name: string; message: string }> = [];

    for (const file of Array.from(files)) {
      const mediaType = detectMediaType(file);
      if (mediaType === 'unsupported') {
        errors.push({ name: file.name, message: `Unsupported file type: ${file.type || 'unknown'}` });
        continue;
      }

      try {
        const metadata = await extractMetadata(file);
        const blobUrl = URL.createObjectURL(file);
        const assetId = toAssetId(`asset-${crypto.randomUUID()}`);

        const durationFrames = metadata.kind === 'image'
          ? fps * 5  // Default 5 seconds for images
          : Math.round(metadata.duration * fps);

        const asset = createAsset({
          id: assetId,
          name: file.name,
          mediaType: mediaType === 'image' ? 'video' : mediaType,
          filePath: blobUrl,
          intrinsicDuration: toFrame(Math.max(1, durationFrames)),
          nativeFps: frameRate(fps),
          sourceTimecodeOffset: toFrame(0),
        });

        const thumbnail = 'thumbnail' in metadata ? metadata.thumbnail : undefined;
        mediaAssets.addImportedAsset(assetId, file, blobUrl, thumbnail);

        const result = engine.dispatch({
          id: `import-asset-${assetId}`,
          label: `Import ${file.name}`,
          timestamp: Date.now(),
          operations: [{ type: 'REGISTER_ASSET', asset }],
        });

        if (!result.accepted) {
          errors.push({ name: file.name, message: `Registration rejected: ${result.reason}` });
          mediaAssets.removeImportedAsset(assetId);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ name: file.name, message });
      }
    }

    setImportErrors(errors);
    setIsImporting(false);
  }, [engine, fps, mediaAssets]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        importFiles(files);
      }
      e.target.value = '';
    },
    [importFiles],
  );

  const handleBinDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  }, []);

  const handleBinDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsDragOver(false);
    }
  }, []);

  const handleBinDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        importFiles(files);
      }
    },
    [importFiles],
  );

  const formatDuration = (duration: number, nativeFps: number): string => {
    const totalSeconds = Math.floor(duration / nativeFps);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div
      className={`asset-bin${isDragOver ? ' bin-drop-active' : ''}${className ? ` ${className}` : ''}`}
      onDragOver={handleBinDragOver}
      onDragLeave={handleBinDragLeave}
      onDrop={handleBinDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,audio/*,image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className="bin-toolbar">
        <button className="bin-upload-btn" onClick={handleImport} title="Import assets" disabled={isImporting}>
          <Upload size={14} />
          <span>{isImporting ? 'Importing...' : 'Upload'}</span>
        </button>
        <div className="bin-controls">
          <button className="bin-control-btn" title="Grid view">
            <Grid3X3 size={14} />
          </button>
          <button className="bin-control-btn" title="Sort">
            <span>Sort</span>
            <SlidersHorizontal size={10} />
          </button>
          <button className="bin-control-btn" title="Filter">
            <span>All</span>
            <Filter size={10} />
          </button>
        </div>
      </div>

      {importErrors.length > 0 && (
        <div className="bin-errors">
          {importErrors.map((err, i) => (
            <div key={i} className="bin-error-msg">
              {err.name}: {err.message}
            </div>
          ))}
        </div>
      )}

      {filteredAssets.length === 0 ? (
        <div className="empty-state" style={{ flex: 1 }}>
          {searchQuery ? (
            <p>No assets match &quot;{searchQuery}&quot;</p>
          ) : (
            <>
              <p>No assets</p>
              <p className="empty-state-hint">Import media files to get started</p>
            </>
          )}
        </div>
      ) : (
        <div className="bin-grid">
          {filteredAssets.map((asset, i) => {
            const assetId = asset.id as string;
            const thumbnail = mediaAssets.getThumbnail(assetId);
            return (
              <div
                key={assetId}
                className={`bin-card${selectedAssetId === asset.id ? ' selected' : ''}`}
                onClick={() => handleAssetClick(asset)}
                draggable
                onDragStart={(e) => handleDragStart(e, asset)}
              >
                <div className={`bin-thumb${!thumbnail ? ` ${getPlaceholderClass(asset.mediaType, i)}` : ''}`}>
                  {thumbnail && (
                    <img
                      className="bin-thumb-img"
                      src={thumbnail}
                      alt={asset.name}
                      draggable={false}
                    />
                  )}
                  <div className="bin-thumb-overlay">
                    {formatDuration(asset.intrinsicDuration as number, (asset.nativeFps as number) || 30)}
                  </div>
                </div>
                <div className="bin-card-info">
                  <div className="bin-card-name">{asset.name}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
