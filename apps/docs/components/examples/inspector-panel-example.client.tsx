'use client';

import dynamic from 'next/dynamic';

const InspectorPanelExampleInner = dynamic(
  () => import('./inspector-panel-example').then((mod) => ({ default: mod.InspectorPanelExample })),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    ),
  },
);

export { InspectorPanelExampleInner as InspectorPanelExample };
