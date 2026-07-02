import React, { useState, useCallback, useRef } from 'react';
import type { TimelineEngine } from '@timelinx/react';
import { createAsset, toFrame, frameRate } from '@timelinx/core';
import type { AssetId } from '@timelinx/core';
import { Upload, Film, Music, Image, FileVideo, GripVertical } from 'lucide-react';

interface MediaPoolProps {
  engine: TimelineEngine;
}

export interface MediaItem {
  id: string;
  assetId: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  duration: number;
  objectUrl?: string;
}

export function MediaPool({ engine }: MediaPoolProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fps = frameRate(30);
    const newItems: MediaItem[] = [];

    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      const isImage = file.type.startsWith('image/');

      if (!isVideo && !isAudio && !isImage) continue;

      const id = `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const assetId = `asset-${id}`;
      const objectUrl = URL.createObjectURL(file);

      // Estimate duration based on file size (rough approximation)
      // In a real app, you'd probe the file for actual duration
      const estimatedDuration = isVideo ? 300 : isAudio ? 300 : 150;

      const asset = createAsset({
        id: assetId,
        name: file.name,
        mediaType: isImage ? 'video' : (isVideo ? 'video' : 'audio'),
        intrinsicDuration: toFrame(estimatedDuration),
        nativeFps: fps,
        filePath: objectUrl,
        sourceTimecodeOffset: toFrame(0),
      });

      // Register the asset with the engine
      engine.dispatch({
        id: `add-asset-${id}`,
        label: `Add asset: ${file.name}`,
        timestamp: Date.now(),
        operations: [{ type: 'REGISTER_ASSET', asset }] as any,
      });

      newItems.push({
        id,
        assetId,
        name: file.name,
        type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
        duration: estimatedDuration,
        objectUrl,
      });
    }

    setItems((prev) => [...prev, ...newItems]);
  }, [engine]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleBrowse = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  }, [handleFiles]);

  const handleItemDragStart = useCallback((e: React.DragEvent, item: MediaItem) => {
    e.dataTransfer.setData('application/x-timeline-asset', item.assetId);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'video': return Film;
      case 'audio': return Music;
      case 'image': return Image;
      default: return FileVideo;
    }
  };

  return (
    <div className="panel-stack">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleBrowse}
        className={`drop-zone${isDragOver ? ' drag-over' : ''}`}
      >
        <div className="drop-zone-icon">
          <Upload size={28} strokeWidth={1.5} />
        </div>
        <div className="drop-zone-label">
          Drop files here or{' '}
          <span className="link-btn">browse</span>
        </div>
        <div className="drop-zone-sub">
          Video, Audio, Images
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*"
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      {items.length > 0 && (
        <div className="media-list">
          <div className="panel-section-title">
            Imported ({items.length})
          </div>
          {items.map((item) => {
            const Icon = getIcon(item.type);
            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleItemDragStart(e, item)}
                className="media-item"
              >
                <GripVertical size={12} className="media-grip" />
                <div className={`media-thumb ${item.type}`}>
                  <Icon size={14} />
                </div>
                <div className="media-meta">
                  <div className="media-name">
                    {item.name}
                  </div>
                  <div className="media-duration">
                    {Math.floor(item.duration / 30)}s
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {items.length === 0 && (
        <div className="panel-empty-sub">
          No media imported yet
        </div>
      )}
    </div>
  );
}
