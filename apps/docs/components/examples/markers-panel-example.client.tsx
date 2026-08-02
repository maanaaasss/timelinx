'use client';

import dynamic from 'next/dynamic';

const MarkersPanelExampleInner = dynamic(
  () => import('./markers-panel-example').then(mod => ({ default: mod.MarkersPanelExample })),
  { ssr: false, loading: () => <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div> }
);

export { MarkersPanelExampleInner as MarkersPanelExample };
