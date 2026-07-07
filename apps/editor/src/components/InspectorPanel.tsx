import { useCallback } from 'react';
import { useEngine, useSelectedClipIds } from '@timelinx/react';
import type { ClipId } from '@timelinx/core';

function findClipAndTrack(engine: ReturnType<typeof useEngine>, clipId: string) {
  const state = engine.getState();
  for (const track of state.timeline.tracks) {
    const clip = track.clips.find((c) => c.id === clipId);
    if (clip) return { clip, trackId: track.id };
  }
  return null;
}

export function InspectorPanel() {
  const engine = useEngine();
  const selectedClipIds = useSelectedClipIds(engine);

  const selectedClipId = selectedClipIds.size === 1 ? Array.from(selectedClipIds)[0] : null;

  const result = selectedClipId ? findClipAndTrack(engine, selectedClipId) : null;
  const clip = result?.clip;
  const trackId = result?.trackId;

  const handleTransformChange = useCallback((property: string, value: number) => {
    if (!clip || !trackId) return;
    const currentTransform = clip.transform;
    if (!currentTransform) return;

    engine.dispatch({
      id: `set-transform-${Date.now()}`,
      label: `Set ${property}`,
      timestamp: Date.now(),
      operations: [{
        type: 'SET_CLIP_TRANSFORM',
        clipId: clip.id as ClipId,
        transform: {
          ...currentTransform,
          [property]: { ...currentTransform[property as keyof typeof currentTransform], value },
        },
      }],
    });
  }, [engine, clip, trackId]);

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
                <input type="number" step={1} value={transform.positionX.value}
                  onChange={(e) => handleTransformChange('positionX', Number(e.target.value))} />
              </div>
              <div className="field-group">
                <label>Position Y</label>
                <input type="number" step={1} value={transform.positionY.value}
                  onChange={(e) => handleTransformChange('positionY', Number(e.target.value))} />
              </div>
              <div className="field-group">
                <label>Scale X</label>
                <input type="number" step={0.1} value={transform.scaleX.value}
                  onChange={(e) => handleTransformChange('scaleX', Number(e.target.value))} />
              </div>
              <div className="field-group">
                <label>Scale Y</label>
                <input type="number" step={0.1} value={transform.scaleY.value}
                  onChange={(e) => handleTransformChange('scaleY', Number(e.target.value))} />
              </div>
              <div className="field-group">
                <label>Rotation</label>
                <input type="number" step={1} value={transform.rotation.value}
                  onChange={(e) => handleTransformChange('rotation', Number(e.target.value))} />
              </div>
              <div className="field-group">
                <label>Opacity</label>
                <input type="number" min={0} max={1} step={0.1} value={transform.opacity.value}
                  onChange={(e) => handleTransformChange('opacity', Number(e.target.value))} />
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
