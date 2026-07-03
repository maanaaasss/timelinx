import React, { useState, useCallback, useRef } from 'react';
import type { TimelineEngine } from '@timelinx/react';
import { Upload, Clapperboard, Mic, Image } from 'lucide-react';

interface MediaPoolProps {
  engine: TimelineEngine;
}

interface MediaItem {
  id: string;
  assetId: string;
  name: string;
  type: 'video' | 'audio' | 'subtitle';
  duration: number;
  isDemo?: boolean;
}

/* Pre-seeded demo assets — match the mock engine's registry */
const DEMO: MediaItem[] = [
  { id: 'd1', assetId: 'asset-intro',     name: 'Intro Sequence',   type: 'video',    duration: 300, isDemo: true },
  { id: 'd2', assetId: 'asset-interview', name: 'Interview A-Cam',  type: 'video',    duration: 600, isDemo: true },
  { id: 'd3', assetId: 'asset-broll-1',  name: 'B-Roll Cityscape', type: 'video',    duration: 240, isDemo: true },
  { id: 'd4', assetId: 'asset-music',     name: 'Background Music', type: 'audio',    duration: 1200, isDemo: true },
  { id: 'd5', assetId: 'asset-voiceover', name: 'Voiceover Take 3', type: 'audio',    duration: 500, isDemo: true },
  { id: 'd6', assetId: 'asset-subs',      name: 'Captions',         type: 'subtitle', duration: 900, isDemo: true },
];

const TYPE_ICONS = {
  video:    <Clapperboard size={13} />,
  audio:    <Mic size={13} />,
  subtitle: <Image size={13} />,
} as const;

function fmt(frames: number, fps = 30): string {
  const s = Math.floor(frames / fps);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
}

export function MediaPool({ engine }: MediaPoolProps) {
  const [userItems, setUserItems] = useState<MediaItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allItems = [...DEMO, ...userItems];

  const groups: Record<string, MediaItem[]> = {
    video:    allItems.filter((i) => i.type === 'video'),
    audio:    allItems.filter((i) => i.type === 'audio'),
    subtitle: allItems.filter((i) => i.type === 'subtitle'),
  };

  const handleFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const next: MediaItem[] = arr
      .filter((f) => f.type.startsWith('video/') || f.type.startsWith('audio/') || f.type.startsWith('image/'))
      .map((f) => ({
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        assetId: `asset-${Date.now()}`,
        name: f.name.replace(/\.[^.]+$/, ''),
        type: f.type.startsWith('audio/') ? 'audio' : 'video',
        duration: 300,
      }));
    setUserItems((p) => [...p, ...next]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div className="panel-stack">
      {/* Drop zone */}
      <div
        className={`drop-zone${isDragOver ? ' drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="drop-zone-icon"><Upload size={18} strokeWidth={1.5} /></div>
        <div className="drop-zone-label">
          Drop files or <span className="link-btn">browse</span>
        </div>
        <div className="drop-zone-sub">Video · Audio · Images</div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.length) {
            handleFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Media groups */}
      {(['video', 'audio', 'subtitle'] as const).map((type) => {
        const items = groups[type];
        if (!items.length) return null;
        const label = type === 'subtitle' ? 'Other' : type.charAt(0).toUpperCase() + type.slice(1);
        return (
          <div key={type} className="media-section">
            <div className="media-section-header">
              <span className={`media-section-dot ${type}`} />
              <span className="media-section-label">{label}</span>
              <span className="media-section-count">{items.length}</span>
            </div>
            <div className="media-list">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="media-item"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-timeline-asset', item.assetId);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  title={`${item.name} — ${fmt(item.duration)}`}
                >
                  <div className={`media-thumb ${type}`}>
                    {TYPE_ICONS[type]}
                  </div>
                  <div className="media-meta">
                    <div className="media-name">{item.name}</div>
                    <div className="media-duration">{fmt(item.duration)}</div>
                  </div>
                  {item.isDemo && <span className="media-demo-chip">demo</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
