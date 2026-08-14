'use client';

import { TimelineClip } from '@timelinx/ui';
import { createClip, toFrame } from '@timelinx/core';

const clip = createClip({
  id: 'demo-clip',
  assetId: 'asset-1',
  trackId: 'v1',
  timelineStart: toFrame(0),
  timelineEnd: toFrame(600),
  mediaIn: toFrame(0),
  mediaOut: toFrame(600),
});

export function TimelineClipExample() {
  return (
    <div style={{ padding: 24, background: 'var(--color-background, #1a1a1a)', borderRadius: 8 }}>
      <div
        style={{
          position: 'relative',
          height: 80,
          border: '1px solid var(--color-border, #333)',
          borderRadius: 4,
        }}
      >
        <TimelineClip
          clip={clip}
          trackId="v1"
          isAudio={false}
          ppf={2}
          height={80}
          isSelected={false}
        />
      </div>
    </div>
  );
}
