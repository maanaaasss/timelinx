'use client';

import dynamic from 'next/dynamic';

const SidebarExampleInner = dynamic(
  () => import('./sidebar-example').then((mod) => ({ default: mod.SidebarExample })),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    ),
  },
);

export { SidebarExampleInner as SidebarExample };
