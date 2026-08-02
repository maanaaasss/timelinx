'use client';

import dynamic from 'next/dynamic';

const CaptionsPanelExampleInner = dynamic(
  () => import('./captions-panel-example').then(mod => ({ default: mod.CaptionsPanelExample })),
  { ssr: false, loading: () => <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div> }
);

export { CaptionsPanelExampleInner as CaptionsPanelExample };
