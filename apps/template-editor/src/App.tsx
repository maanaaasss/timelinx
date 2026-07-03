import React, { useState, useCallback } from 'react';
import { TemplateCanvas } from './components/TemplateCanvas';
import { ElementProperties } from './components/ElementProperties';
import { TemplateLibrary } from './components/TemplateLibrary';
import type { TemplateElement, LockedRegion, BrandKit } from './components/TemplateCanvas';

type PanelId = 'templates' | 'brand' | 'elements';

const DEFAULT_BRAND: BrandKit = {
  colors: ['#7a94ff', '#31d0a2', '#f7b455', '#ff6b66', '#d58bff'],
  fonts: ['Inter', 'Geist', 'JetBrains Mono'],
};

const TEMPLATES = [
  { id: 'blank', name: 'Blank Canvas', category: 'start', color: '#1a1b26' },
  { id: 'ig-story', name: 'IG Story', category: 'social', color: '#e1306c' },
  { id: 'yt-thumb', name: 'YouTube Thumb', category: 'social', color: '#ff0000' },
  { id: 'tiktok', name: 'TikTok', category: 'social', color: '#000000' },
  { id: 'linkedin', name: 'LinkedIn Post', category: 'social', color: '#0a66c2' },
  { id: 'twitter', name: 'Twitter Header', category: 'social', color: '#1da1f2' },
  { id: 'presentation', name: 'Presentation', category: 'docs', color: '#4285f4' },
  { id: 'poster', name: 'Poster', category: 'print', color: '#ff6b35' },
  { id: 'newsletter', name: 'Newsletter', category: 'docs', color: '#10b981' },
  { id: 'business-card', name: 'Business Card', category: 'print', color: '#6366f1' },
];

export default function App() {
  const [activePanel, setActivePanel] = useState<PanelId>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [elements, setElements] = useState<TemplateElement[]>([]);
  const [lockedRegions, setLockedRegions] = useState<LockedRegion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKit>(DEFAULT_BRAND);
  const [templateCategory, setTemplateCategory] = useState<string>('all');

  const selectedElement = elements.find((el) => el.id === selectedId) ?? null;

  const handleAddElement = useCallback((el: TemplateElement) => {
    setElements((prev) => [...prev, el]);
  }, []);

  const handleUpdateElement = useCallback((id: string, patch: Partial<TemplateElement>) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...patch } : el)));
  }, []);

  const handleDeleteElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  const handleAddLockedRegion = useCallback((region: LockedRegion) => {
    setLockedRegions((prev) => [...prev, region]);
  }, []);

  const handleRemoveLockedRegion = useCallback((id: string) => {
    setLockedRegions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleLoadTemplate = useCallback((templateId: string) => {
    setSelectedTemplate(templateId);
    const defaults: Record<string, TemplateElement[]> = {
      'ig-story': [
        { id: 'el-1', type: 'text', x: 40, y: 100, width: 260, height: 50, content: 'Your Story Title', fontSize: 28, fontWeight: 'bold', color: '#ffffff', rotation: 0, zIndex: 1 },
        { id: 'el-2', type: 'text', x: 40, y: 170, width: 260, height: 30, content: 'Subtitle goes here', fontSize: 16, fontWeight: 'normal', color: '#cccccc', rotation: 0, zIndex: 2 },
      ],
      'yt-thumb': [
        { id: 'el-1', type: 'text', x: 30, y: 30, width: 540, height: 60, content: 'BIG TITLE', fontSize: 48, fontWeight: 'bold', color: '#ffffff', rotation: 0, zIndex: 1 },
        { id: 'el-2', type: 'shape', x: 0, y: 120, width: 640, height: 240, shapeType: 'rect', fillColor: '#ff0000', opacity: 0.8, rotation: 0, zIndex: 0 },
      ],
      'tiktok': [
        { id: 'el-1', type: 'text', x: 30, y: 200, width: 300, height: 50, content: 'POV: Creating templates', fontSize: 24, fontWeight: 'bold', color: '#ffffff', rotation: 0, zIndex: 1 },
      ],
    };
    setElements(defaults[templateId] ?? []);
    setSelectedId(null);
    if (templateId === 'blank') {
      setLockedRegions([]);
    }
  }, []);

  return (
    <div className="tpl-shell">
      <header className="tpl-topbar">
        <div className="tpl-topbar-left">
          <div className="tpl-logo">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="1" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <rect x="4" y="4" width="4" height="4" rx="1" fill="currentColor" opacity="0.7" />
              <rect x="10" y="4" width="4" height="4" rx="1" fill="currentColor" opacity="0.4" />
              <rect x="4" y="10" width="4" height="4" rx="1" fill="currentColor" opacity="0.4" />
              <rect x="10" y="10" width="4" height="4" rx="1" fill="currentColor" opacity="0.7" />
            </svg>
          </div>
          <span className="tpl-app-name">timelinx</span>
          <span className="tpl-app-badge">template editor</span>
        </div>
        <div className="tpl-topbar-center">
          <span className="tpl-template-name">{TEMPLATES.find((t) => t.id === selectedTemplate)?.name ?? 'Untitled'}</span>
        </div>
        <div className="tpl-topbar-right">
          <button className="tpl-btn tpl-btn-outline" onClick={() => handleLoadTemplate('blank')}>New</button>
          <button className="tpl-btn tpl-btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
        </div>
      </header>

      <div className="tpl-body">
        <div className="tpl-sidebar">
          {([
            { id: 'templates' as PanelId, icon: 'templates', label: 'Templates' },
            { id: 'elements' as PanelId, icon: 'elements', label: 'Elements' },
            { id: 'brand' as PanelId, icon: 'brand', label: 'Brand' },
          ]).map((item) => (
            <button
              key={item.id}
              className={`tpl-sidebar-btn ${activePanel === item.id ? 'active' : ''}`}
              onClick={() => setActivePanel(item.id)}
              title={item.label}
            >
              {item.icon === 'templates' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              )}
              {item.icon === 'elements' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              )}
              {item.icon === 'brand' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              )}
            </button>
          ))}
        </div>

        <div className="tpl-panel">
          <div className="tpl-panel-header">
            <span className="tpl-panel-title">
              {activePanel === 'templates' && 'Templates'}
              {activePanel === 'elements' && 'Add Elements'}
              {activePanel === 'brand' && 'Brand Kit'}
            </span>
          </div>
          <div className="tpl-panel-body">
            {activePanel === 'templates' && (
              <TemplateLibrary
                templates={TEMPLATES}
                selectedId={selectedTemplate}
                category={templateCategory}
                onCategoryChange={setTemplateCategory}
                onSelect={handleLoadTemplate}
              />
            )}
            {activePanel === 'elements' && (
              <div className="tpl-elements-panel">
                <button className="tpl-add-element-btn" onClick={() => handleAddElement({
                  id: `el-${Date.now()}`,
                  type: 'text',
                  x: 60,
                  y: 60,
                  width: 200,
                  height: 40,
                  content: 'New Text',
                  fontSize: 20,
                  fontWeight: 'normal',
                  color: brandKit.colors[0],
                  rotation: 0,
                  zIndex: elements.length + 1,
                })}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
                  Text Box
                </button>
                <button className="tpl-add-element-btn" onClick={() => handleAddElement({
                  id: `el-${Date.now()}`,
                  type: 'shape',
                  x: 60,
                  y: 60,
                  width: 120,
                  height: 120,
                  shapeType: 'rect',
                  fillColor: brandKit.colors[1],
                  opacity: 1,
                  rotation: 0,
                  zIndex: elements.length + 1,
                })}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
                  Rectangle
                </button>
                <button className="tpl-add-element-btn" onClick={() => handleAddElement({
                  id: `el-${Date.now()}`,
                  type: 'shape',
                  x: 60,
                  y: 60,
                  width: 120,
                  height: 120,
                  shapeType: 'circle',
                  fillColor: brandKit.colors[2],
                  opacity: 1,
                  rotation: 0,
                  zIndex: elements.length + 1,
                })}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>
                  Circle
                </button>
                <button className="tpl-add-element-btn" onClick={() => handleAddElement({
                  id: `el-${Date.now()}`,
                  type: 'image',
                  x: 60,
                  y: 60,
                  width: 200,
                  height: 150,
                  src: '',
                  alt: 'Image placeholder',
                  rotation: 0,
                  zIndex: elements.length + 1,
                })}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  Image
                </button>
                <div className="tpl-divider" />
                <button className="tpl-add-element-btn" onClick={() => {
                  const region: LockedRegion = {
                    id: `locked-${Date.now()}`,
                    x: 20,
                    y: 20,
                    width: 310,
                    height: 60,
                    label: 'Locked Area',
                    color: 'rgba(255,107,102,0.12)',
                  };
                  handleAddLockedRegion(region);
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Locked Region
                </button>
              </div>
            )}
            {activePanel === 'brand' && (
              <div className="tpl-brand-panel">
                <div className="tpl-brand-section">
                  <span className="tpl-brand-label">Brand Colors</span>
                  <div className="tpl-brand-colors">
                    {brandKit.colors.map((c, i) => (
                      <button key={i} className="tpl-brand-swatch" style={{ background: c }} title={c} />
                    ))}
                  </div>
                </div>
                <div className="tpl-brand-section">
                  <span className="tpl-brand-label">Fonts</span>
                  <div className="tpl-brand-fonts">
                    {brandKit.fonts.map((f) => (
                      <span key={f} className="tpl-brand-font" style={{ fontFamily: f }}>{f}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="tpl-canvas-area">
          <TemplateCanvas
            elements={elements}
            lockedRegions={lockedRegions}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdate={handleUpdateElement}
            onDelete={handleDeleteElement}
            onRemoveLocked={handleRemoveLockedRegion}
            brandKit={brandKit}
          />
        </div>

        <div className="tpl-properties">
          <ElementProperties
            element={selectedElement}
            lockedRegions={lockedRegions}
            onUpdate={(patch) => {
              if (selectedId) handleUpdateElement(selectedId, patch);
            }}
            onAddRegion={handleAddLockedRegion}
            onRemoveRegion={handleRemoveLockedRegion}
          />
        </div>
      </div>
    </div>
  );
}
