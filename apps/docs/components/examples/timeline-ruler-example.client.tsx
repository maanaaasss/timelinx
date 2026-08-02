'use client';

import dynamic from 'next/dynamic';

const TimelineRulerExampleInner = dynamic(
  () => import('./timeline-ruler-example').then(mod => ({ default: mod.TimelineRulerExample })),
  { ssr: false, loading: () => <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div> }
);

export { TimelineRulerExampleInner as TimelineRulerExample };
