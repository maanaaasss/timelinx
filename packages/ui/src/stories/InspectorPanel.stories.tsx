import type { Meta, StoryObj } from '@storybook/react';
import React, { useMemo } from 'react';
import { InspectorPanel } from '../components/inspector-panel';
import { TimelineProvider } from '../context/timeline-context';
import { createMockEngine } from './helpers/mock-engine';

const meta: Meta<typeof InspectorPanel> = {
  title: 'Panels/InspectorPanel',
  component: InspectorPanel,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof InspectorPanel>;

export const NoSelection: Story = {
  name: 'No Selection',
  render: () => {
    const engine = useMemo(() => createMockEngine(), []);
    return (
      <TimelineProvider engine={engine}>
        <div style={{ width: '320px', background: '#141419', border: '1px solid #2a2a36', borderRadius: '8px' }}>
          <InspectorPanel />
        </div>
      </TimelineProvider>
    );
  },
};

export const ClipSelected: Story = {
  name: 'Clip Selected',
  render: () => {
    const engine = useMemo(() => {
      const eng = createMockEngine();
      eng.setSelectedClipIds(new Set(['clip-intro']));
      return eng;
    }, []);

    return (
      <TimelineProvider engine={engine}>
        <div style={{ width: '320px', background: '#141419', border: '1px solid #2a2a36', borderRadius: '8px' }}>
          <InspectorPanel />
        </div>
      </TimelineProvider>
    );
  },
};
