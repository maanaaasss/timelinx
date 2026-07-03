import React, { useState, useCallback } from 'react';
import { useEngine } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import type { Asset, AssetId } from '@timelinx/core';

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
    // This would typically open a file picker
    // For now, we'll just log that import was requested
    console.log('Import assets requested');
  }, []);

  const formatDuration = (duration: number, fps: number): string => {
    const totalSeconds = Math.floor(duration / fps);
    const frames = duration % fps;
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600);
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  const getMediaTypeIcon = (mediaType: string): string => {
    switch (mediaType) {
      case 'video': return '🎬';
      case 'audio': return '🎵';
      case 'image': return '🖼️';
      default: return '📁';
    }
  };

  return (
    <div className={`asset-bin${className ? ` ${className}` : ''}`}>
      <div className="panel-header">
        <h3 className="panel-title">Assets</h3>
        <button className="panel-action-btn" onClick={handleImport} title="Import assets">
          +
        </button>
      </div>

      <div className="panel-content">
        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {filteredAssets.length === 0 ? (
          <div className="empty-state">
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
          <ul className="asset-list">
            {filteredAssets.map((asset) => (
              <li
                key={asset.id as string}
                className={`asset-item${selectedAssetId === asset.id ? ' selected' : ''}`}
                onClick={() => handleAssetClick(asset)}
                draggable
                onDragStart={(e) => handleDragStart(e, asset)}
              >
                <span className="asset-icon">{getMediaTypeIcon(asset.mediaType)}</span>
                <div className="asset-info">
                  <span className="asset-name">{asset.name}</span>
                  <span className="asset-meta">
                    {asset.mediaType} • {formatDuration(asset.intrinsicDuration as number, (asset.nativeFps as number) || 30)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});
