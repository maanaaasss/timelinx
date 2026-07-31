'use client';

import dynamic from 'next/dynamic';

const TransportControlsExampleInner = dynamic(
  () => import('./transport-controls-example').then(mod => ({ default: mod.TransportControlsExample })),
  { ssr: false, loading: () => <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div> }
);

export { TransportControlsExampleInner as TransportControlsExample };
