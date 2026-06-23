import React, { useState, useCallback, useRef } from 'react';
import type { TimelineEngine } from '@timelinx/react';
import { Upload, Film, Music, Image, FileVideo } from 'lucide-react';

interface MediaPoolProps {
  engine: TimelineEngine;
}

interface MediaItem {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  duration?: number;
  objectUrl?: string;
}

export function MediaPool({ engine }: MediaPoolProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const newItems: MediaItem[] = [];
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      const isImage = file.type.startsWith('image/');

      if (!isVideo && !isAudio && !isImage) continue;

      const id = `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const objectUrl = URL.createObjectURL(file);

      newItems.push({
        id,
        name: file.name,
        type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
        objectUrl,
      });
    }
    setItems((prev) => [...prev, ...newItems]);
  }, []);

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item) => {
            const Icon = getIcon(item.type);
            return (
              <div
                key={item.id}
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
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                }}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 6,
                  color: 'rgba(255,255,255,0.4)',
                }}>
                  <Icon size={14} />
                </div>
                <span style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 500,
                }}>
                  {item.name}
                </span>
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
