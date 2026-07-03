import React, { useState } from 'react';
import { Sliders, Layers, Sun, Wind, Zap, Droplets, Eye, Sparkles } from 'lucide-react';

const EFFECTS = [
  { id: 'color-grade',  name: 'Color Grade',    cat: 'Color',   icon: <Sliders size={13} />,  color: 'var(--accent)' },
  { id: 'lut',          name: 'LUT Lookup',      cat: 'Color',   icon: <Layers size={13} />,   color: 'var(--track-image)' },
  { id: 'exposure',     name: 'Exposure',         cat: 'Color',   icon: <Sun size={13} />,      color: 'var(--track-subtitle)' },
  { id: 'blur',         name: 'Gaussian Blur',   cat: 'Filter',  icon: <Wind size={13} />,     color: 'var(--track-video)' },
  { id: 'sharpen',      name: 'Sharpen',          cat: 'Filter',  icon: <Zap size={13} />,      color: 'var(--track-video)' },
  { id: 'denoise',      name: 'Noise Reduction', cat: 'Filter',  icon: <Droplets size={13} />, color: 'var(--track-audio)' },
  { id: 'vignette',     name: 'Vignette',         cat: 'Stylize', icon: <Eye size={13} />,      color: 'var(--text-secondary)' },
  { id: 'glow',         name: 'Bloom',            cat: 'Stylize', icon: <Sparkles size={13} />, color: 'var(--track-image)' },
] as const;

const CATS = ['All', 'Color', 'Filter', 'Stylize'];

export function EffectsPanel() {
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');

  const list = EFFECTS.filter(
    (fx) =>
      (cat === 'All' || fx.cat === cat) &&
      fx.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="effects-browser">
      <input
        className="search-input"
        placeholder="Search effects…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 6 }}
      />

      <div className="effects-filter-row">
        {CATS.map((c) => (
          <button
            key={c}
            className={`fx-filter-btn${cat === c ? ' active' : ''}`}
            onClick={() => setCat(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="fx-list">
        {list.map((fx) => (
          <button
            key={fx.id}
            className="fx-item"
            title={`Drag ${fx.name} onto a clip`}
            draggable
          >
            <div
              className="fx-icon"
              style={{
                color: fx.color,
                background: `color-mix(in srgb, ${fx.color} 14%, transparent)`,
              }}
            >
              {fx.icon}
            </div>
            <div>
              <div className="fx-label">{fx.name}</div>
              <div className="fx-cat">{fx.cat}</div>
            </div>
          </button>
        ))}

        {list.length === 0 && (
          <div className="inspector-empty" style={{ padding: '20px 0' }}>
            <span className="inspector-empty-sub">No effects found</span>
          </div>
        )}
      </div>

      <div className="fx-hint">Drag onto a clip to apply</div>
    </div>
  );
}
