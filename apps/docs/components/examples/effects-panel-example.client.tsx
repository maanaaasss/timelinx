'use client';

import dynamic from 'next/dynamic';

const EffectsPanelExampleInner = dynamic(
  () => import('./effects-panel-example').then((mod) => ({ default: mod.EffectsPanelExample })),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    ),
  },
);

export { EffectsPanelExampleInner as EffectsPanelExample };
