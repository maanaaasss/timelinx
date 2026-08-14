'use client';

import { TabbedPanel } from '@timelinx/ui';
import type { TabDefinition } from '@timelinx/ui';
import { useState } from 'react';

const tabs = [
  { id: 'general', label: 'General' },
  { id: 'advanced', label: 'Advanced' },
] as const satisfies readonly TabDefinition[];

export function TabbedPanelExample() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div style={{ padding: 24, background: 'var(--color-background, #1a1a1a)', borderRadius: 8 }}>
      <TabbedPanel tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
        <div>
          <p style={{ margin: 0 }}>General settings content goes here.</p>
          <p style={{ margin: '8px 0 0', color: 'var(--color-muted, #888)', fontSize: 13 }}>
            Resolution, frame rate, and project name.
          </p>
        </div>
        <div>
          <p style={{ margin: 0 }}>Advanced settings content goes here.</p>
          <p style={{ margin: '8px 0 0', color: 'var(--color-muted, #888)', fontSize: 13 }}>
            Hardware acceleration, proxy mode, and cache settings.
          </p>
        </div>
      </TabbedPanel>
    </div>
  );
}
