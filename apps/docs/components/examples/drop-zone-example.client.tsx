'use client';

import dynamic from 'next/dynamic';

const DropZoneExampleInner = dynamic(
  () => import('./drop-zone-example').then((mod) => ({ default: mod.DropZoneExample })),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    ),
  },
);

export { DropZoneExampleInner as DropZoneExample };
