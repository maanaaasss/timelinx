'use client';

import dynamic from 'next/dynamic';

const MediaPreviewExampleInner = dynamic(
  () => import('./media-preview-example').then(mod => ({ default: mod.MediaPreviewExample })),
  { ssr: false, loading: () => <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div> }
);

export { MediaPreviewExampleInner as MediaPreviewExample };
