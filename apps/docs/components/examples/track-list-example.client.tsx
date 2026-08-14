'use client';

import dynamic from 'next/dynamic';

const TrackListExampleInner = dynamic(
  () => import('./track-list-example').then((mod) => ({ default: mod.TrackListExample })),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    ),
  },
);

export { TrackListExampleInner as TrackListExample };
