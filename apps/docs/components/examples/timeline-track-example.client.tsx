'use client';

import dynamic from 'next/dynamic';

const TimelineTrackExampleInner = dynamic(
  () => import('./timeline-track-example').then(mod => ({ default: mod.TimelineTrackExample })),
  { ssr: false, loading: () => <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div> }
);

export { TimelineTrackExampleInner as TimelineTrackExample };
