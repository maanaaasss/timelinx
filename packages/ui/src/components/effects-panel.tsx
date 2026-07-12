import React, { useState, useCallback } from 'react';
import { useEngine, useSelectedClipIds, useClipEffects } from '@timelinx/react';
import { createEffect, toEffectId } from '@timelinx/core';
import { useTimelineContext } from '../context/timeline-context';
import { CollapsibleSection } from './collapsible-section';
import type { ClipId, EffectId } from '@timelinx/core';

function EffectsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18" />
      <path d="M5.636 5.636l12.728 12.728" />
      <path d="M18.364 5.636L5.636 18.364" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

const EFFECT_TYPES = [
  { type: 'blur', label: 'Blur', icon: '🌫', color: '#60a5fa' },
  { type: 'brightness', label: 'Brightness', icon: '☀', color: '#fbbf24' },
  { type: 'contrast', label: 'Contrast', icon: '◐', color: '#a78bfa' },
  { type: 'saturation', label: 'Saturation', icon: '🎨', color: '#f472b6' },
  { type: 'hueRotate', label: 'Hue Rotate', icon: '🔄', color: '#34d399' },
  { type: 'colorCorrect', label: 'Color Correct', icon: '🎯', color: '#2dd4bf' },
];

export interface EffectsPanelProps {
  className?: string;
}

export const EffectsPanel = React.memo(function EffectsPanel({
  className,
}: EffectsPanelProps) {
  const { engine } = useTimelineContext();
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
      operations: [{ type: 'REMOVE_EFFECT', clipId: selectedClipId as ClipId, effectId: effectId as EffectId }],
    });
  }, [engine, selectedClipId]);

  const handleToggleEffect = useCallback((effectId: string, enabled: boolean) => {
    if (!selectedClipId) return;
    engine.dispatch({
      id: `toggle-effect-${Date.now()}`,
      label: `${enabled ? 'Enable' : 'Disable'} effect`,
      timestamp: Date.now(),
      operations: [{ type: 'SET_EFFECT_ENABLED', clipId: selectedClipId as ClipId, effectId: effectId as EffectId, enabled }],
    });
  }, [engine, selectedClipId]);

  if (!selectedClipId) {
    return (
      <div className={`inspector-panel${className ? ` ${className}` : ''}`}>
        <div className="panel-header">
          <h3 className="panel-title">Effects</h3>
        </div>
        <div className="panel-content">
          <div className="empty-state">
            <p>Select a clip to view its effects</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`inspector-panel${className ? ` ${className}` : ''}`}>
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
        <CollapsibleSection title="Effects" icon={<EffectsIcon />} defaultOpen>
          {addMenuOpen && (
          <div className="effect-add-menu">
            {EFFECT_TYPES.map((et) => (
              <button
                key={et.type}
                className="effect-menu-item"
                onClick={() => handleAddEffect(et.type)}
              >
                <span className="effect-menu-icon" style={{ color: et.color }}>{et.icon}</span>
                <span className="effect-menu-label">{et.label}</span>
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
            {effects.map((effect) => {
              const effectMeta = EFFECT_TYPES.find((et) => et.type === effect.effectType);
              return (
                <li key={effect.id} className="effect-item">
                  <div
                    className="effect-icon-badge"
                    style={{
                      background: `${effectMeta?.color ?? 'var(--bg-subtle)'}18`,
                      borderColor: `${effectMeta?.color ?? 'var(--border-faint)'}40`,
                    }}
                  >
                    <span style={{ color: effectMeta?.color ?? 'var(--text-tertiary)' }}>
                      {effectMeta?.icon ?? '◆'}
                    </span>
                  </div>
                  <div className="effect-info">
                    <span className="effect-name">{effectMeta?.label ?? effect.effectType}</span>
                    <span className="effect-meta">{effect.renderStage}</span>
                  </div>
                  <div className="effect-actions">
                    <button
                      className={`effect-toggle-btn${effect.enabled ? ' enabled' : ''}`}
                      title={effect.enabled ? 'Disable' : 'Enable'}
                      onClick={() => handleToggleEffect(effect.id, !effect.enabled)}
                    >
                      <span className="effect-toggle-track">
                        <span className="effect-toggle-thumb" />
                      </span>
                    </button>
                    <button
                      className="effect-delete-btn"
                      title="Remove effect"
                      onClick={() => handleRemoveEffect(effect.id)}
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        </CollapsibleSection>
      </div>
    </div>
  );
});
