import React, { useState, useRef, useCallback } from 'react';

export interface TemplateElement {
  id: string;
  type: 'text' | 'shape' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  shapeType?: 'rect' | 'circle';
  fillColor?: string;
  opacity?: number;
  src?: string;
  alt?: string;
  rotation: number;
  zIndex: number;
}

export interface LockedRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
}

export interface BrandKit {
  colors: string[];
  fonts: string[];
}

interface Props {
  elements: TemplateElement[];
  lockedRegions: LockedRegion[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<TemplateElement>) => void;
  onDelete: (id: string) => void;
  onRemoveLocked: (id: string) => void;
  brandKit: BrandKit;
}

export function TemplateCanvas({
  elements,
  lockedRegions,
  selectedId,
  onSelect,
  onUpdate,
  onDelete,
  onRemoveLocked,
  brandKit,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizing, setResizing] = useState<string | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, id: string, isLocked?: boolean) => {
    if (isLocked) return;
    e.stopPropagation();
    const el = elements.find((el) => el.id === id);
    if (!el) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging(id);
    setDragOffset({ x: e.clientX - rect.left - el.x, y: e.clientY - rect.top - el.y });
    onSelect(id);
  }, [elements, onSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;
    onUpdate(dragging, { x: Math.max(0, x), y: Math.max(0, y) });
  }, [dragging, dragOffset, onUpdate]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setResizing(null);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) onSelect(null);
  }, [onSelect]);

  const isLocked = (el: TemplateElement) => {
    return lockedRegions.some(
      (r) =>
        el.x + el.width > r.x &&
        el.x < r.x + r.width &&
        el.y + el.height > r.y &&
        el.y < r.y + r.height,
    );
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedId) onDelete(selectedId);
    }
  }, [selectedId, onDelete]);

  return (
    <div
      ref={canvasRef}
      className="tpl-canvas"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="tpl-canvas-inner">
        {elements.map((el) => {
          const locked = isLocked(el);
          return (
            <div
              key={el.id}
              className={`tpl-element ${el.id === selectedId ? 'selected' : ''} ${locked ? 'locked' : ''}`}
              style={{
                left: el.x,
                top: el.y,
                width: el.width,
                height: el.height,
                zIndex: el.zIndex,
                transform: `rotate(${el.rotation}deg)`,
                cursor: locked ? 'not-allowed' : dragging === el.id ? 'grabbing' : 'grab',
              }}
              onMouseDown={(e) => handleMouseDown(e, el.id, locked)}
            >
              {el.type === 'text' && (
                <div
                  className="tpl-element-text"
                  style={{
                    fontSize: el.fontSize,
                    fontWeight: el.fontWeight,
                    color: el.color,
                  }}
                >
                  {el.content}
                </div>
              )}
              {el.type === 'shape' && (
                <div
                  className={`tpl-element-shape ${el.shapeType}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: el.fillColor,
                    opacity: el.opacity,
                  }}
                />
              )}
              {el.type === 'image' && (
                <div className="tpl-element-image">
                  {el.src ? (
                    <img src={el.src} alt={el.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  )}
                </div>
              )}
              {locked && (
                <div className="tpl-lock-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
              )}
            </div>
          );
        })}

        {lockedRegions.map((region) => (
          <div
            key={region.id}
            className="tpl-locked-region"
            style={{
              left: region.x,
              top: region.y,
              width: region.width,
              height: region.height,
              background: region.color,
            }}
          >
            <div className="tpl-locked-label">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              {region.label}
            </div>
            <button
              className="tpl-locked-remove"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveLocked(region.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
