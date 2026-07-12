import React, { useState, useCallback } from 'react';
import { useEngine } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import type { Asset, AssetId } from '@timelinx/core';

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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>Upload</span>
        </button>
        <div className="bin-controls">
          <button className="bin-control-btn" title="Grid view">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>
          <button className="bin-control-btn" title="Sort">
            <span>Sort</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
          </button>
          <button className="bin-control-btn" title="Filter">
            <span>All</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
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
