'use client';

import dynamic from 'next/dynamic';

const TextPanelExampleInner = dynamic(
  () => import('./text-panel-example').then(mod => ({ default: mod.TextPanelExample })),
  { ssr: false, loading: () => <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div> }
);

export { TextPanelExampleInner as TextPanelExample };
