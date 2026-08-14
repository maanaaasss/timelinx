'use client';

import dynamic from 'next/dynamic';

const CollapsibleSectionExampleInner = dynamic(
  () =>
    import('./collapsible-section-example').then((mod) => ({
      default: mod.CollapsibleSectionExample,
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

export { CollapsibleSectionExampleInner as CollapsibleSectionExample };
