'use client';

import dynamic from 'next/dynamic';

const ExportDialogExampleInner = dynamic(
  () => import('./export-dialog-example').then((mod) => ({ default: mod.ExportDialogExample })),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    ),
  },
);

export { ExportDialogExampleInner as ExportDialogExample };
