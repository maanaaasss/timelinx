'use client';

import { TopNav } from '@timelinx/ui';

export function TopNavExample() {
  return (
    <div style={{ padding: 24, background: 'var(--color-background, #1a1a1a)', borderRadius: 8 }}>
      <TopNav
        projectName="Demo Project"
        onBack={() => alert('Back clicked')}
        onExport={() => alert('Export clicked')}
      />
    </div>
  );
}
