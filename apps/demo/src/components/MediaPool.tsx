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
    e.dataTransfer.setData('application/x-timelinx-asset', JSON.stringify({
      assetId: item.assetId,
      name: item.name,
      type: item.type,
      duration: item.duration,
    }));
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleBrowse}
        style={{
          padding: '24px 16px',
          border: `2px dashed ${isDragOver ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 12,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 200ms ease',
          background: isDragOver ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
        }}
        onMouseEnter={(e) => {
          if (!isDragOver) {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragOver) {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
          }
        }}
      >
        <div style={{ marginBottom: 10, color: 'rgba(255,255,255,0.2)' }}>
          <Upload size={28} strokeWidth={1.5} />
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
          Drop files here or{' '}
          <span style={{ color: '#818cf8', fontWeight: 500 }}>browse</span>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.3)',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 4,
          }}>
            Imported ({items.length})
          </div>
          {items.map((item) => {
            const Icon = getIcon(item.type);
            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleItemDragStart(e, item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  fontSize: 12,
                  border: '1px solid rgba(255,255,255,0.04)',
                  transition: 'all 150ms ease',
                  cursor: 'grab',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                }}
              >
                <GripVertical size={12} style={{ color: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                <div style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: item.type === 'video'
                    ? 'rgba(59,130,246,0.15)'
                    : item.type === 'audio'
                      ? 'rgba(16,185,129,0.15)'
                      : 'rgba(245,158,11,0.15)',
                  borderRadius: 6,
                  color: item.type === 'video'
                    ? '#60a5fa'
                    : item.type === 'audio'
                      ? '#34d399'
                      : '#fbbf24',
                  flexShrink: 0,
                }}>
                  <Icon size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: 500,
                    fontSize: 12,
                  }}>
                    {item.name}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.25)',
                    fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                    marginTop: 2,
                  }}>
                    {Math.floor(item.duration / 30)}s
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {items.length === 0 && (
        <div style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.2)',
          textAlign: 'center',
          padding: '12px 0',
        }}>
          No media imported yet
        </div>
      )}
    </div>
  );
}
