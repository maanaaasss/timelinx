'use client';

import { Sidebar } from '@timelinx/ui';
import { useState } from 'react';

export function SidebarExample() {
  const [activePanel, setActivePanel] = useState('media');

  return (
    <div style={{ padding: 24, background: 'var(--color-background, #1a1a1a)', borderRadius: 8 }}>
      <div style={{ height: 500, border: '1px solid var(--color-border, #333)', borderRadius: 4, overflow: 'hidden' }}>
        <Sidebar activePanel={activePanel} onPanelChange={setActivePanel} />
      </div>
      <p style={{ marginTop: 12, color: 'var(--color-muted, #888)', fontSize: 13 }}>
        Active panel: <strong>{activePanel}</strong>
      </p>
    </div>
  );
}
