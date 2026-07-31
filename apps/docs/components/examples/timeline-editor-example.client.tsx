'use client';

import dynamic from 'next/dynamic';

const TimelineEditorExampleInner = dynamic(
  () => import('./timeline-editor-example').then(mod => ({ default: mod.TimelineEditorExample })),
  { ssr: false, loading: () => <div style={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div> }
);

export { TimelineEditorExampleInner as TimelineEditorExample };
