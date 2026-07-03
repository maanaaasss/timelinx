import React from 'react';
import type { Caption } from '../App';

type CaptionEditorProps = {
  captions: Caption[];
  selectedCaption: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<Caption>) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
};

const CAPTION_STYLES: { value: Caption['style']; label: string; preview: string }[] = [
  { value: 'default', label: 'Default', preview: 'Aa' },
  { value: 'bold', label: 'Bold', preview: 'Aa' },
  { value: 'glow', label: 'Glow', preview: 'Aa' },
  { value: 'gradient', label: 'Gradient', preview: 'Aa' },
];

export function CaptionEditor({
  captions,
  selectedCaption,
  onSelect,
  onUpdate,
  onAdd,
  onDelete,
}: CaptionEditorProps) {
  const selected = captions.find((c) => c.id === selectedCaption);

  return (
    <div className="caption-editor">
      <div className="panel-header">
        <h3>Captions</h3>
        <button className="add-btn" onClick={onAdd}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Add
        </button>
      </div>

      <div className="caption-list">
        {captions.map((caption) => (
          <button
            key={caption.id}
            className={`caption-item ${selectedCaption === caption.id ? 'selected' : ''}`}
            onClick={() => onSelect(caption.id)}
          >
            <span className="caption-item-text">{caption.text}</span>
            <span className="caption-item-time">
              {formatFrameRange(caption.startFrame, caption.endFrame)}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="caption-inspector">
          <div className="inspector-field">
            <label>Text</label>
            <textarea
              className="caption-text-input"
              value={selected.text}
              onChange={(e) => onUpdate(selected.id, { text: e.target.value })}
              rows={3}
            />
          </div>

          <div className="inspector-field">
            <label>Style</label>
            <div className="style-grid">
              {CAPTION_STYLES.map((style) => (
                <button
                  key={style.value}
                  className={`style-option ${selected.style === style.value ? 'active' : ''}`}
                  onClick={() => onUpdate(selected.id, { style: style.value })}
                >
                  <span className={`style-preview style-${style.value}`}>{style.preview}</span>
                  <span className="style-label">{style.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="inspector-row">
            <div className="inspector-field">
              <label>Start</label>
              <input
                type="number"
                className="frame-input"
                value={selected.startFrame}
                onChange={(e) =>
                  onUpdate(selected.id, { startFrame: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="inspector-field">
              <label>End</label>
              <input
                type="number"
                className="frame-input"
                value={selected.endFrame}
                onChange={(e) =>
                  onUpdate(selected.id, { endFrame: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <button className="delete-btn" onClick={() => onDelete(selected.id)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 4h10M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M11 4v7a1 1 0 01-1 1H4a1 1 0 01-1-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Delete Caption
          </button>
        </div>
      )}
    </div>
  );
}

function formatFrameRange(start: number, end: number): string {
  const formatFrame = (f: number) => {
    const seconds = Math.floor(f / 30);
    const frames = f % 30;
    return `${seconds}:${frames.toString().padStart(2, '0')}`;
  };
  return `${formatFrame(start)} → ${formatFrame(end)}`;
}