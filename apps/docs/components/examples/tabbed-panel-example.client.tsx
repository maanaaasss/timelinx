'use client';

import dynamic from 'next/dynamic';

const TabbedPanelExampleInner = dynamic(
  () => import('./tabbed-panel-example').then(mod => ({ default: mod.TabbedPanelExample })),
  { ssr: false, loading: () => <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div> }
);

export { TabbedPanelExampleInner as TabbedPanelExample };
