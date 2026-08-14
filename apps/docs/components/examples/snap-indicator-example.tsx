'use client';

import { SnapIndicator } from '@timelinx/ui';

const SNAP_FRAMES = [100, 300, 600, 900];
const PPF = 4;
const TOTAL_HEIGHT = 200;

export function SnapIndicatorExample() {
  return (
    <div style={{ padding: 24, background: 'var(--color-background, #1a1a1a)', borderRadius: 8 }}>
      <div
        style={{
          position: 'relative',
          height: TOTAL_HEIGHT,
          overflow: 'hidden',
          border: '1px solid var(--color-border, #333)',
          borderRadius: 4,
        }}
      >
        {SNAP_FRAMES.map((f) => (
          <div
            key={f}
            style={{
              position: 'absolute',
              top: 0,
              left: f * PPF,
              bottom: 0,
              width: 1,
              background: 'var(--color-border, #555)',
              opacity: 0.3,
            }}
          />
        ))}
        <SnapIndicator frames={SNAP_FRAMES} ppf={PPF} totalHeight={TOTAL_HEIGHT} />
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-muted-foreground, #888)' }}>
        Snap lines at frames {SNAP_FRAMES.join(', ')} ({PPF}px/frame)
      </div>
    </div>
  );
}
