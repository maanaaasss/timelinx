import React, { useCallback } from 'react';
import { useSelectedClipIds, useClip } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';
import { CollapsibleSection } from './collapsible-section';
import { NumberScrubber } from './number-scrubber';
import type { ClipId } from '@timelinx/core';
import { getClipTransform } from '../types/transform';

function TransformIcon() {
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
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

export interface InspectorPanelProps {
  className?: string;
}

export const InspectorPanel = React.memo(function InspectorPanel({
  className,
}: InspectorPanelProps) {
  const { engine } = useTimelineContext();
  const selectedClipIds = useSelectedClipIds(engine);

  const selectedClipId = selectedClipIds.size === 1 ? Array.from(selectedClipIds)[0] : null;
  const clip = useClip(selectedClipId ?? '');

  const handleTransformCommit = useCallback(
    (property: string, value: number) => {
      if (!clip) return;
      const currentTransform = getClipTransform(clip);

      engine.dispatch({
        id: `set-transform-${Date.now()}`,
        label: `Set ${property}`,
        timestamp: Date.now(),
        operations: [
          {
            type: 'SET_CLIP_METADATA',
            clipId: clip.id as ClipId,
            metadata: {
              ...clip.metadata,
              transform: {
                ...currentTransform,
                [property]: {
                  ...currentTransform[property as keyof typeof currentTransform],
                  value,
                },
              },
            },
          },
        ],
      });
    },
    [engine, clip],
  );

  if (!selectedClipId || !clip) {
    return (
      <div className={`inspector-panel${className ? ` ${className}` : ''}`}>
        <div className="panel-header">
          <h3 className="panel-title">Inspector</h3>
        </div>
        <div className="panel-content">
          <div className="empty-state">
            <p>Select a clip to inspect</p>
            <p className="empty-state-hint">
              Select a single clip to view its transform properties
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (selectedClipIds.size > 1) {
    return (
      <div className={`inspector-panel${className ? ` ${className}` : ''}`}>
        <div className="panel-header">
          <h3 className="panel-title">Inspector</h3>
        </div>
        <div className="panel-content">
          <div className="empty-state">
            <p>{selectedClipIds.size} clips selected</p>
            <p className="empty-state-hint">Select a single clip to inspect</p>
          </div>
        </div>
      </div>
    );
  }

  const transform = getClipTransform(clip);

  return (
    <div className={`inspector-panel${className ? ` ${className}` : ''}`}>
      <div className="panel-header">
        <h3 className="panel-title">Inspector</h3>
      </div>
      <div className="panel-content">
        <CollapsibleSection title="Transform" icon={<TransformIcon />}>
          {transform ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div className="field-pair">
                <NumberScrubber
                  label="X"
                  value={transform.positionX.value}
                  onChange={() => {}}
                  onCommit={(v) => handleTransformCommit('positionX', v)}
                  step={1}
                />
                <NumberScrubber
                  label="Y"
                  value={transform.positionY.value}
                  onChange={() => {}}
                  onCommit={(v) => handleTransformCommit('positionY', v)}
                  step={1}
                />
              </div>
              <div className="field-pair">
                <NumberScrubber
                  label="SX"
                  value={transform.scaleX.value}
                  onChange={() => {}}
                  onCommit={(v) => handleTransformCommit('scaleX', v)}
                  step={0.1}
                />
                <NumberScrubber
                  label="SY"
                  value={transform.scaleY.value}
                  onChange={() => {}}
                  onCommit={(v) => handleTransformCommit('scaleY', v)}
                  step={0.1}
                />
              </div>
              <div className="field-pair">
                <NumberScrubber
                  label="R"
                  value={transform.rotation.value}
                  onChange={() => {}}
                  onCommit={(v) => handleTransformCommit('rotation', v)}
                  step={1}
                />
                <NumberScrubber
                  label="O"
                  value={transform.opacity.value}
                  onChange={() => {}}
                  onCommit={(v) => handleTransformCommit('opacity', v)}
                  min={0}
                  max={1}
                  step={0.1}
                />
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>Clip has no transform data</p>
            </div>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
});
