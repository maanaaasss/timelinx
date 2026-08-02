'use client';

import dynamic from 'next/dynamic';

const CompositorPreviewExampleInner = dynamic(
  () => import('./compositor-preview-example').then(mod => ({ default: mod.CompositorPreviewExample })),
  { ssr: false, loading: () => <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div> }
);

export { CompositorPreviewExampleInner as CompositorPreviewExample };
