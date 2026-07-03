import React, { useState } from 'react';
import type { Overlay } from '../App';

type OverlayPanelProps = {
  overlays: Overlay[];
  selectedOverlay: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<Overlay>) => void;
  onAdd: (type: Overlay['type'], content: string) => void;
  onDelete: (id: string) => void;
};

const EMOJI_PRESETS = [
  '🔥', '💯', '⭐', '🎵', '🎤', '🎬', '✨', '💎',
  '🙌', '👏', '💪', '🎯', '🚀', '💫', '🌟', '⚡',
];

const STICKER_PRESETS = [
  'Like', 'Subscribe', 'Follow', 'Share', 'Comment', 'Save',
  'New', 'Hot', 'Trending', 'Viral',
];

export function OverlayPanel({
  overlays,
  selectedOverlay,
  onSelect,
  onUpdate,
  onAdd,
  onDelete,
}: OverlayPanelProps) {
  const [textInput, setTextInput] = useState('Your text here');
  const [activeTab, setActiveTab] = useState<'text' | 'emoji' | 'sticker'>('text');
  const selected = overlays.find((o) => o.id === selectedOverlay);

  return (
    <div className="overlay-panel">
      <div className="panel-header">
        <h3>Overlays</h3>
      </div>

      <div className="overlay-tabs">
        {(['text', 'emoji', 'sticker'] as const).map((tab) => (
          <button
            key={tab}
            className={`overlay-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'text' && 'T'}
            {tab === 'emoji' && '😊'}
            {tab === 'sticker' && '🏷️'}
          </button>
        ))}
      </div>

      <div className="overlay-add-section">
        {activeTab === 'text' && (
          <div className="text-add-controls">
            <input
              type="text"
              className="overlay-text-input"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter text..."
            />
            <button
              className="add-overlay-btn"
              onClick={() => onAdd('text', textInput)}
            >
              Add Text
            </button>
          </div>
        )}

        {activeTab === 'emoji' && (
          <div className="emoji-grid">
            {EMOJI_PRESETS.map((emoji) => (
              <button
                key={emoji}
                className="emoji-btn"
                onClick={() => onAdd('emoji', emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'sticker' && (
          <div className="sticker-grid">
            {STICKER_PRESETS.map((sticker) => (
              <button
                key={sticker}
                className="sticker-btn"
                onClick={() => onAdd('sticker', sticker)}
              >
                {sticker}
              </button>
            ))}
          </div>
        )}
      </div>

      {overlays.length > 0 && (
        <div className="overlay-list">
          <div className="overlay-list-header">
            <span>Active Overlays</span>
            <span className="count">{overlays.length}</span>
          </div>
          {overlays.map((overlay) => (
            <button
              key={overlay.id}
              className={`overlay-item ${selectedOverlay === overlay.id ? 'selected' : ''}`}
              onClick={() => onSelect(overlay.id)}
            >
              <span className="overlay-item-icon">
                {overlay.type === 'text' && 'T'}
                {overlay.type === 'emoji' && overlay.content}
                {overlay.type === 'sticker' && '🏷️'}
              </span>
              <span className="overlay-item-content">
                {overlay.type === 'text' ? overlay.content : overlay.content}
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="overlay-inspector">
          <div className="inspector-field">
            <label>Content</label>
            <input
              type="text"
              className="overlay-content-input"
              value={selected.content}
              onChange={(e) => onUpdate(selected.id, { content: e.target.value })}
            />
          </div>

          <div className="inspector-row">
            <div className="inspector-field">
              <label>X</label>
              <input
                type="number"
                className="frame-input"
                value={selected.x}
                onChange={(e) => onUpdate(selected.id, { x: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="inspector-field">
              <label>Y</label>
              <input
                type="number"
                className="frame-input"
                value={selected.y}
                onChange={(e) => onUpdate(selected.id, { y: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="inspector-field">
            <label>Size</label>
            <input
              type="range"
              className="size-slider"
              min="16"
              max="120"
              value={selected.size}
              onChange={(e) => onUpdate(selected.id, { size: parseInt(e.target.value) })}
            />
            <span className="size-value">{selected.size}px</span>
          </div>

          <button className="delete-btn" onClick={() => onDelete(selected.id)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 4h10M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M11 4v7a1 1 0 01-1 1H4a1 1 0 01-1-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Delete Overlay
          </button>
        </div>
      )}
    </div>
  );
}