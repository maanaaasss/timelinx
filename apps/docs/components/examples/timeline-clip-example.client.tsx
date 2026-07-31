'use client';

import dynamic from 'next/dynamic';

const TimelineClipExampleInner = dynamic(
  () => import('./timeline-clip-example').then(mod => ({ default: mod.TimelineClipExample })),
  { ssr: false, loading: () => <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div> }
);

export { TimelineClipExampleInner as TimelineClipExample };
