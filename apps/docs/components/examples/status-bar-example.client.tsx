'use client';

import dynamic from 'next/dynamic';

const StatusBarExampleInner = dynamic(
  () => import('./status-bar-example').then((mod) => ({ default: mod.StatusBarExample })),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    ),
  },
);

export { StatusBarExampleInner as StatusBarExample };
