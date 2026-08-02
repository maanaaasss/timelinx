'use client';

import dynamic from 'next/dynamic';

const TopNavExampleInner = dynamic(
  () => import('./top-nav-example').then(mod => ({ default: mod.TopNavExample })),
  { ssr: false, loading: () => <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div> }
);

export { TopNavExampleInner as TopNavExample };
