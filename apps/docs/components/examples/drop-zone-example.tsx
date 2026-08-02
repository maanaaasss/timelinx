'use client';

import { DropZone } from '@timelinx/ui';

const DROP_FRAME = 450;
const PPF = 4;
const TOTAL_HEIGHT = 200;

export function DropZoneExample() {
  return (
    <div style={{ padding: 24, background: 'var(--color-background, #1a1a1a)', borderRadius: 8 }}>
      <div style={{ position: 'relative', height: TOTAL_HEIGHT, overflow: 'hidden', border: '1px solid var(--color-border, #333)', borderRadius: 4 }}>
        <DropZone frame={DROP_FRAME} ppf={PPF} totalHeight={TOTAL_HEIGHT} fps={30} />
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-muted-foreground, #888)' }}>
        Drop target at frame {DROP_FRAME}
      </div>
    </div>
  );
}
