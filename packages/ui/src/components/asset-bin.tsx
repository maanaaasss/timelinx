import React, { useState, useCallback } from 'react';
import { useEngine } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import type { Asset, AssetId } from '@timelinx/core';
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
  const [selectedAssetId, setSelectedAssetId] = useState<AssetId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const state = engine.getState();
  const assets = Array.from(state.assetRegistry.values());

  const filteredAssets = searchQuery
    ? assets.filter((asset) =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.mediaType.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : assets;

  const handleAssetClick = useCallback((asset: Asset) => {
    setSelectedAssetId(asset.id);
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, asset: Asset) => {
    e.dataTransfer.setData('application/x-timeline-asset', asset.id as string);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleImport = useCallback(() => {
    console.log('Import assets requested');
  }, []);

  const formatDuration = (duration: number, fps: number): string => {
    const totalSeconds = Math.floor(duration / fps);
    const frames = duration % fps;
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className={`asset-bin${className ? ` ${className}` : ''}`}>
      <div className="bin-toolbar">
        <button className="bin-upload-btn" onClick={handleImport} title="Import assets">
          <Upload size={14} />
          <span>Upload</span>
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
          {filteredAssets.map((asset, i) => (
            <div
              key={asset.id as string}
              className={`bin-card${selectedAssetId === asset.id ? ' selected' : ''}`}
              onClick={() => handleAssetClick(asset)}
              draggable
              onDragStart={(e) => handleDragStart(e, asset)}
            >
              <div className={`bin-thumb ${getPlaceholderClass(asset.mediaType, i)}`}>
                <div className="bin-thumb-overlay">
                  {formatDuration(asset.intrinsicDuration as number, (asset.nativeFps as number) || 30)}
                </div>
              </div>
              <div className="bin-card-info">
                <div className="bin-card-name">{asset.name}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
