'use client';

import dynamic from 'next/dynamic';

const TimelineToolbarExampleInner = dynamic(
  () => import('./timeline-toolbar-example').then(mod => ({ default: mod.TimelineToolbarExample })),
  { ssr: false, loading: () => <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div> }
);

export { TimelineToolbarExampleInner as TimelineToolbarExample };
