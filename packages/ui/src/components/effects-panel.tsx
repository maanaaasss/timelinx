import React, { useState, useCallback } from 'react';
import { useSelectedClipIds, useClipEffects, useClip } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import { CollapsibleSection } from './collapsible-section';
import { getEffectColor } from '../shared/effect-colors';
import type { ClipId } from '@timelinx/core';
import { createEffect, type Effect } from '../types/effects';

function EffectsIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v18" />
      <path d="M5.636 5.636l12.728 12.728" />
      <path d="M18.364 5.636L5.636 18.364" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

const EFFECT_TYPES = [
  { type: 'blur', label: 'Blur', icon: '🌫' },
  { type: 'brightness', label: 'Brightness', icon: '☀' },
  { type: 'contrast', label: 'Contrast', icon: '◐' },
  { type: 'saturation', label: 'Saturation', icon: '🎨' },
  { type: 'hueRotate', label: 'Hue Rotate', icon: '🔄' },
  { type: 'colorCorrect', label: 'Color Correct', icon: '🎯' },
];

export interface EffectsPanelProps {
  className?: string;
}

export const EffectsPanel = React.memo(function EffectsPanel({ className }: EffectsPanelProps) {
  const { engine } = useTimelineContext();
  const selectedClipIds = useSelectedClipIds(engine);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const selectedClipId = selectedClipIds.size === 1 ? Array.from(selectedClipIds)[0] : null;
  const clip = useClip(selectedClipId ?? '');
  const effects = useClipEffects(engine, selectedClipId ?? '') as readonly Effect[];

  const handleAddEffect = useCallback(
    (effectType: string) => {
      if (!selectedClipId || !clip) return;
      const effect = createEffect(`effect-${Date.now()}`, effectType, 'preComposite');
      const nextEffects = [...effects, effect];
      engine.dispatch({
        id: `add-effect-${Date.now()}`,
        label: `Add ${effectType} effect`,
        timestamp: Date.now(),
        operations: [
          {
            type: 'SET_CLIP_METADATA',
            clipId: selectedClipId as ClipId,
            metadata: {
              ...clip.metadata,
              effects: nextEffects,
            },
          },
        ],
      });
      setAddMenuOpen(false);
    },
    [engine, selectedClipId, clip, effects],
  );

  const handleRemoveEffect = useCallback(
    (effectId: string) => {
      if (!selectedClipId || !clip) return;
      const nextEffects = effects.filter((e) => e.id !== effectId);
      engine.dispatch({
        id: `remove-effect-${Date.now()}`,
        label: 'Remove effect',
        timestamp: Date.now(),
        operations: [
          {
            type: 'SET_CLIP_METADATA',
            clipId: selectedClipId as ClipId,
            metadata: {
              ...clip.metadata,
              effects: nextEffects,
            },
          },
        ],
      });
    },
    [engine, selectedClipId, clip, effects],
  );

  const handleToggleEffect = useCallback(
    (effectId: string, enabled: boolean) => {
      if (!selectedClipId || !clip) return;
      const nextEffects = effects.map((e) => (e.id === effectId ? { ...e, enabled } : e));
      engine.dispatch({
        id: `toggle-effect-${Date.now()}`,
        label: `${enabled ? 'Enable' : 'Disable'} effect`,
        timestamp: Date.now(),
        operations: [
          {
            type: 'SET_CLIP_METADATA',
            clipId: selectedClipId as ClipId,
            metadata: {
              ...clip.metadata,
              effects: nextEffects,
            },
          },
        ],
      });
    },
    [engine, selectedClipId, clip, effects],
  );

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
        <button className="panel-action-btn" onClick={() => setAddMenuOpen(!addMenuOpen)}>
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
                  <span className="effect-menu-icon" style={{ color: getEffectColor(et.type) }}>
                    {et.icon}
                  </span>
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
                const effectColor = getEffectColor(effect.effectType);
                const effectMeta = EFFECT_TYPES.find((et) => et.type === effect.effectType);
                return (
                  <li key={effect.id} className="effect-item">
                    <div
                      className="effect-icon-badge"
                      style={{
                        background: `${effectColor}18`,
                        borderColor: `${effectColor}40`,
                      }}
                    >
                      <span style={{ color: effectColor }}>{effectMeta?.icon ?? '◆'}</span>
                    </div>
                    <div className="effect-info">
                      <span className="effect-name">{effectMeta?.label ?? effect.effectType}</span>
                      <span className="effect-meta">{effect.renderStage ?? effect.stage}</span>
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
