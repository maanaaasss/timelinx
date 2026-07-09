import { useCallback, useState, useEffect } from 'react';
import { useEngine, useSelectedClipIds, useClip } from '@timelinx/react';
import type { ClipId } from '@timelinx/core';

export function InspectorPanel() {
  const engine = useEngine();
  const selectedClipIds = useSelectedClipIds(engine);

  const selectedClipId = selectedClipIds.size === 1 ? Array.from(selectedClipIds)[0] : null;
  const clip = useClip(selectedClipId ?? '');

  const trackId = clip?.trackId ?? null;

  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!isTyping && clip?.transform) {
      setLocalValues({
        positionX: String(clip.transform.positionX.value),
        positionY: String(clip.transform.positionY.value),
        scaleX: String(clip.transform.scaleX.value),
        scaleY: String(clip.transform.scaleY.value),
        rotation: String(clip.transform.rotation.value),
        opacity: String(clip.transform.opacity.value),
      });
    }
  }, [clip?.transform, isTyping]);

  const handleTransformChange = useCallback((property: string, rawValue: string) => {
    setLocalValues((prev) => ({ ...prev, [property]: rawValue }));
    setIsTyping(true);
  }, []);

  const handleTransformCommit = useCallback((property: string) => {
    if (!clip || !trackId) return;
    const currentTransform = clip.transform;
    if (!currentTransform) return;

    const rawValue = localValues[property];
    const numValue = Number(rawValue);

    if (rawValue === '' || rawValue === '-' || isNaN(numValue)) {
      setLocalValues((prev) => ({ ...prev, [property]: String(currentTransform[property as keyof typeof currentTransform].value) }));
      setIsTyping(false);
      return;
    }

    engine.dispatch({
      id: `set-transform-${Date.now()}`,
      label: `Set ${property}`,
      timestamp: Date.now(),
      operations: [{
        type: 'SET_CLIP_TRANSFORM',
        clipId: clip.id as ClipId,
        transform: {
          ...currentTransform,
          [property]: { ...currentTransform[property as keyof typeof currentTransform], value: numValue },
        },
      }],
    });
    setIsTyping(false);
  }, [engine, clip, trackId, localValues]);

  if (!selectedClipId || !clip) {
    return (
      <div className="inspector-panel">
        <div className="panel-header"><h3 className="panel-title">Inspector</h3></div>
        <div className="panel-content">
          <div className="empty-state">
            <p>Select a clip to inspect</p>
          </div>
        </div>
      </div>
    );
  }

  if (selectedClipIds.size > 1) {
    return (
      <div className="inspector-panel">
        <div className="panel-header"><h3 className="panel-title">Inspector</h3></div>
        <div className="panel-content">
          <div className="empty-state">
            <p>{selectedClipIds.size} clips selected</p>
            <p className="empty-state-hint">Select a single clip to inspect</p>
          </div>
        </div>
      </div>
    );
  }

  const transform = clip.transform;

  return (
    <div className="inspector-panel">
      <div className="panel-header"><h3 className="panel-title">Inspector</h3></div>
      <div className="panel-content">
        <div className="inspector-section">
          <h4 className="section-title">Transform</h4>
          {transform ? (
            <>
              <div className="field-group">
                <label>Position X</label>
                <input type="number" step={1} value={localValues.positionX ?? String(transform.positionX.value)}
                  onChange={(e) => handleTransformChange('positionX', e.target.value)}
                  onBlur={() => handleTransformCommit('positionX')}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTransformCommit('positionX'); }} />
              </div>
              <div className="field-group">
                <label>Position Y</label>
                <input type="number" step={1} value={localValues.positionY ?? String(transform.positionY.value)}
                  onChange={(e) => handleTransformChange('positionY', e.target.value)}
                  onBlur={() => handleTransformCommit('positionY')}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTransformCommit('positionY'); }} />
              </div>
              <div className="field-group">
                <label>Scale X</label>
                <input type="number" step={0.1} value={localValues.scaleX ?? String(transform.scaleX.value)}
                  onChange={(e) => handleTransformChange('scaleX', e.target.value)}
                  onBlur={() => handleTransformCommit('scaleX')}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTransformCommit('scaleX'); }} />
              </div>
              <div className="field-group">
                <label>Scale Y</label>
                <input type="number" step={0.1} value={localValues.scaleY ?? String(transform.scaleY.value)}
                  onChange={(e) => handleTransformChange('scaleY', e.target.value)}
                  onBlur={() => handleTransformCommit('scaleY')}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTransformCommit('scaleY'); }} />
              </div>
              <div className="field-group">
                <label>Rotation</label>
                <input type="number" step={1} value={localValues.rotation ?? String(transform.rotation.value)}
                  onChange={(e) => handleTransformChange('rotation', e.target.value)}
                  onBlur={() => handleTransformCommit('rotation')}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTransformCommit('rotation'); }} />
              </div>
              <div className="field-group">
                <label>Opacity</label>
                <input type="number" min={0} max={1} step={0.1} value={localValues.opacity ?? String(transform.opacity.value)}
                  onChange={(e) => handleTransformChange('opacity', e.target.value)}
                  onBlur={() => handleTransformCommit('opacity')}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTransformCommit('opacity'); }} />
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>Clip has no transform data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
