import React, { useState } from 'react';
import { Plus, Trash2, Power, ChevronDown, ChevronRight } from 'lucide-react';

interface Effect {
  id: string;
  name: string;
  enabled: boolean;
  params: Record<string, number>;
}

const BUILTIN_EFFECTS = [
  'Gaussian Blur',
  'Sharpen',
  'Unsharp Mask',
  'Color Balance',
  'Hue/Saturation',
  'Brightness/Contrast',
  'Levels',
  'Curves',
  'LUT Apply',
  'Chroma Key',
  'Luma Key',
  'Drop Shadow',
  'Glow',
  'Film Grain',
  'Vignette',
  'Lens Flare',
  'Transform',
  'Crop',
  'Mirror',
  'Strobe',
];

export function EffectsRack() {
  const [effects, setEffects] = useState<Effect[]>([
    { id: 'fx-1', name: 'Color Balance', enabled: true, params: { shadows: 0, midtones: 0, highlights: 0 } },
    { id: 'fx-2', name: 'Sharpen', enabled: true, params: { amount: 50, radius: 1 } },
  ]);
  const [expandedId, setExpandedId] = useState<string | null>('fx-1');
  const [showPicker, setShowPicker] = useState(false);

  const addEffect = (name: string) => {
    const newFx: Effect = {
      id: `fx-${Date.now()}`,
      name,
      enabled: true,
      params: { amount: 50 },
    };
    setEffects((prev) => [...prev, newFx]);
    setShowPicker(false);
    setExpandedId(newFx.id);
  };

  const removeEffect = (id: string) => {
    setEffects((prev) => prev.filter((e) => e.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const toggleEffect = (id: string) => {
    setEffects((prev) =>
      prev.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e))
    );
  };

  const updateParam = (id: string, key: string, value: number) => {
    setEffects((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, params: { ...e.params, [key]: value } } : e
      )
    );
  };

  return (
    <div className="pro-effects-rack">
      <div className="pro-fx-toolbar">
        <button className="pro-fx-add-btn" onClick={() => setShowPicker(!showPicker)}>
          <Plus size={12} />
          Add Effect
        </button>
      </div>

      {showPicker && (
        <div className="pro-fx-picker">
          {BUILTIN_EFFECTS.map((name) => (
            <button
              key={name}
              className="pro-fx-picker-item"
              onClick={() => addEffect(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="pro-fx-list">
        {effects.map((fx) => {
          const expanded = expandedId === fx.id;
          return (
            <div key={fx.id} className={`pro-fx-item${fx.enabled ? '' : ' disabled'}`}>
              <div className="pro-fx-item-header" onClick={() => setExpandedId(expanded ? null : fx.id)}>
                <button
                  className={`pro-fx-toggle${fx.enabled ? ' on' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleEffect(fx.id); }}
                  title={fx.enabled ? 'Disable' : 'Enable'}
                >
                  <Power size={10} />
                </button>

                <span className="pro-fx-name">{fx.name}</span>

                <div className="pro-fx-actions">
                  <button
                    className="pro-fx-remove"
                    onClick={(e) => { e.stopPropagation(); removeEffect(fx.id); }}
                    title="Remove"
                  >
                    <Trash2 size={10} />
                  </button>
                  {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </div>
              </div>

              {expanded && (
                <div className="pro-fx-params">
                  {Object.entries(fx.params).map(([key, val]) => (
                    <div key={key} className="pro-fx-param">
                      <span className="pro-fx-param-label">{key}</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={val}
                        onChange={(e) => updateParam(fx.id, key, +e.target.value)}
                        className="pro-slider"
                      />
                      <span className="pro-fx-param-value">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {effects.length === 0 && (
          <div className="pro-fx-empty">
            <span>No effects applied</span>
            <span className="pro-fx-empty-sub">Select a clip and add effects</span>
          </div>
        )}
      </div>
    </div>
  );
}
