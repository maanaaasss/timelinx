import React from 'react';
import type { TemplateElement, LockedRegion } from './TemplateCanvas';

interface Props {
  element: TemplateElement | null;
  lockedRegions: LockedRegion[];
  onUpdate: (patch: Partial<TemplateElement>) => void;
  onAddRegion: (region: LockedRegion) => void;
  onRemoveRegion: (id: string) => void;
}

export function ElementProperties({ element, lockedRegions, onUpdate, onAddRegion, onRemoveRegion }: Props) {
  if (!element) {
    return (
      <div className="tpl-props">
        <div className="tpl-props-header">
          <span className="tpl-props-title">Properties</span>
        </div>
        <div className="tpl-props-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-disabled)' }}><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
          <span>Select an element to edit its properties</span>
        </div>
        <div className="tpl-props-section">
          <span className="tpl-props-section-title">Locked Regions</span>
          {lockedRegions.length === 0 ? (
            <span className="tpl-props-hint">No locked regions</span>
          ) : (
            lockedRegions.map((r) => (
              <div key={r.id} className="tpl-locked-item">
                <span className="tpl-locked-name">{r.label}</span>
                <button className="tpl-locked-delete" onClick={() => onRemoveRegion(r.id)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="tpl-props">
      <div className="tpl-props-header">
        <span className="tpl-props-title">Properties</span>
        <span className="tpl-props-type">{element.type}</span>
      </div>

      <div className="tpl-props-section">
        <span className="tpl-props-section-title">Position & Size</span>
        <div className="tpl-props-row">
          <label className="tpl-props-label">X</label>
          <input
            className="tpl-props-input"
            type="number"
            value={Math.round(element.x)}
            onChange={(e) => onUpdate({ x: Number(e.target.value) })}
          />
        </div>
        <div className="tpl-props-row">
          <label className="tpl-props-label">Y</label>
          <input
            className="tpl-props-input"
            type="number"
            value={Math.round(element.y)}
            onChange={(e) => onUpdate({ y: Number(e.target.value) })}
          />
        </div>
        <div className="tpl-props-row">
          <label className="tpl-props-label">W</label>
          <input
            className="tpl-props-input"
            type="number"
            value={Math.round(element.width)}
            onChange={(e) => onUpdate({ width: Number(e.target.value) })}
          />
        </div>
        <div className="tpl-props-row">
          <label className="tpl-props-label">H</label>
          <input
            className="tpl-props-input"
            type="number"
            value={Math.round(element.height)}
            onChange={(e) => onUpdate({ height: Number(e.target.value) })}
          />
        </div>
        <div className="tpl-props-row">
          <label className="tpl-props-label">Rotate</label>
          <input
            className="tpl-props-input"
            type="number"
            value={element.rotation}
            min={-360}
            max={360}
            onChange={(e) => onUpdate({ rotation: Number(e.target.value) })}
          />
        </div>
      </div>

      {element.type === 'text' && (
        <div className="tpl-props-section">
          <span className="tpl-props-section-title">Text</span>
          <div className="tpl-props-row">
            <label className="tpl-props-label">Content</label>
            <input
              className="tpl-props-input tpl-props-input-wide"
              type="text"
              value={element.content ?? ''}
              onChange={(e) => onUpdate({ content: e.target.value })}
            />
          </div>
          <div className="tpl-props-row">
            <label className="tpl-props-label">Size</label>
            <input
              className="tpl-props-input"
              type="number"
              value={element.fontSize ?? 16}
              min={8}
              max={200}
              onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
            />
          </div>
          <div className="tpl-props-row">
            <label className="tpl-props-label">Weight</label>
            <select
              className="tpl-props-select"
              value={element.fontWeight ?? 'normal'}
              onChange={(e) => onUpdate({ fontWeight: e.target.value })}
            >
              <option value="normal">Normal</option>
              <option value="bold">Bold</option>
              <option value="lighter">Light</option>
            </select>
          </div>
          <div className="tpl-props-row">
            <label className="tpl-props-label">Color</label>
            <input
              className="tpl-props-color"
              type="color"
              value={element.color ?? '#ffffff'}
              onChange={(e) => onUpdate({ color: e.target.value })}
            />
          </div>
        </div>
      )}

      {element.type === 'shape' && (
        <div className="tpl-props-section">
          <span className="tpl-props-section-title">Shape</span>
          <div className="tpl-props-row">
            <label className="tpl-props-label">Fill</label>
            <input
              className="tpl-props-color"
              type="color"
              value={element.fillColor ?? '#ffffff'}
              onChange={(e) => onUpdate({ fillColor: e.target.value })}
            />
          </div>
          <div className="tpl-props-row">
            <label className="tpl-props-label">Opacity</label>
            <input
              className="tpl-props-slider"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={element.opacity ?? 1}
              onChange={(e) => onUpdate({ opacity: Number(e.target.value) })}
            />
            <span className="tpl-props-value">{Math.round((element.opacity ?? 1) * 100)}%</span>
          </div>
        </div>
      )}

      {element.type === 'image' && (
        <div className="tpl-props-section">
          <span className="tpl-props-section-title">Image</span>
          <div className="tpl-props-row">
            <label className="tpl-props-label">URL</label>
            <input
              className="tpl-props-input tpl-props-input-wide"
              type="text"
              value={element.src ?? ''}
              placeholder="Paste image URL..."
              onChange={(e) => onUpdate({ src: e.target.value })}
            />
          </div>
        </div>
      )}

      <div className="tpl-props-section">
        <span className="tpl-props-section-title">Layer</span>
        <div className="tpl-props-row">
          <label className="tpl-props-label">Z-Index</label>
          <input
            className="tpl-props-input"
            type="number"
            value={element.zIndex}
            min={0}
            onChange={(e) => onUpdate({ zIndex: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="tpl-props-section">
        <span className="tpl-props-section-title">Locked Regions</span>
        {lockedRegions.length === 0 ? (
          <span className="tpl-props-hint">No locked regions</span>
        ) : (
          lockedRegions.map((r) => (
            <div key={r.id} className="tpl-locked-item">
              <span className="tpl-locked-name">{r.label}</span>
              <button className="tpl-locked-delete" onClick={() => onRemoveRegion(r.id)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
