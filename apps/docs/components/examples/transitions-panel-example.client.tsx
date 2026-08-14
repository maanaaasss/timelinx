'use client';

import dynamic from 'next/dynamic';

const TransitionsPanelExampleInner = dynamic(
  () =>
    import('./transitions-panel-example').then((mod) => ({ default: mod.TransitionsPanelExample })),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    ),
  },
);

export { TransitionsPanelExampleInner as TransitionsPanelExample };
