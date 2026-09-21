import type { Meta, StoryObj } from '@storybook/react';
import React, { useMemo } from 'react';
import { TimelineLayout } from '../components/timeline/timeline-layout';
import { TimelineProvider } from '../context/timeline-context';
import { createMockEngine } from './helpers/mock-engine';

// Import preset styles for preview container
import '../presets/dark-pro.css';
import '../presets/light.css';
import '../presets/high-contrast.css';
import '../styles/structure.css';

const meta: Meta = {
  title: 'Themes/ThemePresets',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

function EngineLayoutContainer({ className }: { className: string }) {
  const engine = useMemo(() => createMockEngine(), []);
  return (
    <TimelineProvider engine={engine} initialPpf={10}>
      <div className={className} style={{ width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
        <TimelineLayout variant="v3" />
      </div>
    </TimelineProvider>
  );
}

export const DarkProTheme: StoryObj = {
  name: 'Dark Pro (Default)',
  render: () => (
    <div style={{ padding: '24px', background: '#0c0c10', minHeight: '450px' }}>
      <EngineLayoutContainer className="theme-dark-pro" />
    </div>
  ),
};

export const LightTheme: StoryObj = {
  name: 'Light Theme',
  render: () => (
    <div style={{ padding: '24px', background: '#f6f7f9', minHeight: '450px' }}>
      <EngineLayoutContainer className="theme-light" />
    </div>
  ),
};

export const HighContrastTheme: StoryObj = {
  name: 'High Contrast Theme',
  render: () => (
    <div style={{ padding: '24px', background: '#000000', minHeight: '450px' }}>
      <EngineLayoutContainer className="theme-high-contrast" />
    </div>
  ),
};
