'use client';

import dynamic from 'next/dynamic';

const KeyframesPanelExampleInner = dynamic(
  () => import('./keyframes-panel-example').then((mod) => ({ default: mod.KeyframesPanelExample })),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    ),
  },
);

export { KeyframesPanelExampleInner as KeyframesPanelExample };
