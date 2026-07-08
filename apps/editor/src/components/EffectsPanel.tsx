import { useState, useCallback } from 'react';
import { useEngine, useSelectedClipIds, useClipEffects } from '@timelinx/react';
import { createEffect, toEffectId } from '@timelinx/core';
import type { ClipId } from '@timelinx/core';

const EFFECT_TYPES = [
  { type: 'blur', label: 'Blur' },
  { type: 'brightness', label: 'Brightness' },
  { type: 'contrast', label: 'Contrast' },
  { type: 'saturation', label: 'Saturation' },
  { type: 'hueRotate', label: 'Hue Rotate' },
  { type: 'colorCorrect', label: 'Color Correct' },
];

export function EffectsPanel() {
  const engine = useEngine();
  const selectedClipIds = useSelectedClipIds(engine);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const selectedClipId = selectedClipIds.size === 1 ? Array.from(selectedClipIds)[0] : null;
  const effects = useClipEffects(engine, selectedClipId ?? '');

  const handleAddEffect = useCallback((effectType: string) => {
    if (!selectedClipId) return;
    const effect = createEffect(
      toEffectId(`effect-${Date.now()}`),
      effectType,
      'preComposite',
    );
    engine.dispatch({
      id: `add-effect-${Date.now()}`,
      label: `Add ${effectType} effect`,
      timestamp: Date.now(),
      operations: [{ type: 'ADD_EFFECT', clipId: selectedClipId as ClipId, effect }],
    });
    setAddMenuOpen(false);
  }, [engine, selectedClipId]);

  const handleRemoveEffect = useCallback((effectId: string) => {
    if (!selectedClipId) return;
    engine.dispatch({
      id: `remove-effect-${Date.now()}`,
      label: 'Remove effect',
      timestamp: Date.now(),
      operations: [{ type: 'REMOVE_EFFECT', clipId: selectedClipId as ClipId, effectId: effectId as import('@timelinx/core').EffectId }],
    });
  }, [engine, selectedClipId]);

  const handleToggleEffect = useCallback((effectId: string, enabled: boolean) => {
    if (!selectedClipId) return;
    engine.dispatch({
      id: `toggle-effect-${Date.now()}`,
      label: `${enabled ? 'Enable' : 'Disable'} effect`,
      timestamp: Date.now(),
      operations: [{ type: 'SET_EFFECT_ENABLED', clipId: selectedClipId as ClipId, effectId: effectId as import('@timelinx/core').EffectId, enabled }],
    });
  }, [engine, selectedClipId]);

  if (!selectedClipId) {
    return (
      <div className="inspector-panel">
        <div className="panel-header"><h3 className="panel-title">Effects</h3></div>
        <div className="panel-content">
          <div className="empty-state">
            <p>Select a clip to view its effects</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="inspector-panel">
      <div className="panel-header">
        <h3 className="panel-title">Effects</h3>
        <button
          className="panel-action-btn"
          onClick={() => setAddMenuOpen(!addMenuOpen)}
        >
          + Add
        </button>
      </div>
      <div className="panel-content">
        {addMenuOpen && (
          <div className="effect-add-menu">
            {EFFECT_TYPES.map((et) => (
              <button
                key={et.type}
                className="effect-menu-item"
                onClick={() => handleAddEffect(et.type)}
              >
                {et.label}
              </button>
            ))}
          </div>
        )}

        {effects.length === 0 ? (
          <div className="empty-state">
            <p>No effects on this clip</p>
            <p className="empty-state-hint">Click "+ Add" to add one</p>
          </div>
        ) : (
          <ul className="effects-list">
            {effects.map((effect) => (
              <li key={effect.id} className="effect-item">
                <div className="effect-info">
                  <span className="effect-type">{effect.effectType}</span>
                  <span className="effect-stage">{effect.renderStage}</span>
                </div>
                <div className="effect-actions">
                  <button
                    className={`effect-toggle-btn${effect.enabled ? ' enabled' : ''}`}
                    title={effect.enabled ? 'Disable' : 'Enable'}
                    onClick={() => handleToggleEffect(effect.id, !effect.enabled)}
                  >
                    {effect.enabled ? 'ON' : 'OFF'}
                  </button>
                  <button
                    className="effect-delete-btn"
                    title="Remove effect"
                    onClick={() => handleRemoveEffect(effect.id)}
                  >
                    x
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
