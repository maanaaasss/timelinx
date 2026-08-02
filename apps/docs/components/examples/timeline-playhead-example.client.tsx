'use client';

import dynamic from 'next/dynamic';

const TimelinePlayheadExampleInner = dynamic(
  () => import('./timeline-playhead-example').then(mod => ({ default: mod.TimelinePlayheadExample })),
  { ssr: false, loading: () => <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div> }
);

export { TimelinePlayheadExampleInner as TimelinePlayheadExample };
