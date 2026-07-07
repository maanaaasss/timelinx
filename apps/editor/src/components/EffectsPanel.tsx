import { useState, useCallback } from 'react';
import { useEngine, useSelectedClipIds } from '@timelinx/react';
import { createEffect, toEffectId } from '@timelinx/core';
import type { Effect, ClipId, TrackId } from '@timelinx/core';

const EFFECT_TYPES = [
  { type: 'blur', label: 'Blur' },
  { type: 'brightness', label: 'Brightness' },
  { type: 'contrast', label: 'Contrast' },
  { type: 'saturation', label: 'Saturation' },
  { type: 'hueRotate', label: 'Hue Rotate' },
  { type: 'colorCorrect', label: 'Color Correct' },
];

function findClipTrackMap(engine: ReturnType<typeof useEngine>) {
  const state = engine.getState();
  const map = new Map<string, { trackId: TrackId; clip: Effect['id'] extends string ? import('@timelinx/core').Clip : never }>();
  for (const track of state.timeline.tracks) {
    for (const clip of track.clips) {
      map.set(clip.id, { trackId: track.id as TrackId, clip: clip as never });
    }
  }
  return map;
}

export function EffectsPanel() {
  const engine = useEngine();
  const selectedClipIds = useSelectedClipIds(engine);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const selectedClipId = selectedClipIds.size === 1 ? Array.from(selectedClipIds)[0] : null;

  let clip: import('@timelinx/core').Clip | null = null;
  let trackId: TrackId | null = null;
  if (selectedClipId) {
    const map = findClipTrackMap(engine);
    const entry = map.get(selectedClipId);
    if (entry) {
      clip = entry.clip;
      trackId = entry.trackId;
    }
  }

  const effects: readonly Effect[] = clip?.effects ?? [];

  const handleAddEffect = useCallback((effectType: string) => {
    if (!selectedClipId || !trackId) return;
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
  }, [engine, selectedClipId, trackId]);

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
