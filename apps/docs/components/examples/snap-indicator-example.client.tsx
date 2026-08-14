'use client';

import dynamic from 'next/dynamic';

const SnapIndicatorExampleInner = dynamic(
  () => import('./snap-indicator-example').then((mod) => ({ default: mod.SnapIndicatorExample })),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    ),
  },
);

export { SnapIndicatorExampleInner as SnapIndicatorExample };
