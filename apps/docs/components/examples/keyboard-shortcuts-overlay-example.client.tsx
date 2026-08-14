'use client';

import dynamic from 'next/dynamic';

const KeyboardShortcutsOverlayExampleInner = dynamic(
  () =>
    import('./keyboard-shortcuts-overlay-example').then((mod) => ({
      default: mod.KeyboardShortcutsOverlayExample,
    })),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    ),
  },
);

export { KeyboardShortcutsOverlayExampleInner as KeyboardShortcutsOverlayExample };
