'use client';

import dynamic from 'next/dynamic';

const CommandPaletteExampleInner = dynamic(
  () => import('./command-palette-example').then((mod) => ({ default: mod.CommandPaletteExample })),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    ),
  },
);

export { CommandPaletteExampleInner as CommandPaletteExample };
