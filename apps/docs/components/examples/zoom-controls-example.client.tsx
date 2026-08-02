'use client';

import dynamic from 'next/dynamic';

const ZoomControlsExampleInner = dynamic(
  () => import('./zoom-controls-example').then(mod => ({ default: mod.ZoomControlsExample })),
  { ssr: false, loading: () => <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div> }
);

export { ZoomControlsExampleInner as ZoomControlsExample };
