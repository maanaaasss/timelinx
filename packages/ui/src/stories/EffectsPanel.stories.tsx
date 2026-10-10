import type { Meta, StoryObj } from '@storybook/react';
import React, { useMemo } from 'react';
import { EffectsPanel } from '../components/effects-panel';
import { TimelineProvider } from '../context/timeline-context';
import { createMockEngine } from './helpers/mock-engine';
import { createEffect } from '../types/effects';
import type { ClipId } from '@timelinx/core';

const meta: Meta<typeof EffectsPanel> = {
  title: 'Panels/EffectsPanel',
  component: EffectsPanel,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EffectsPanel>;

export const ClipWithEffects: Story = {
  name: 'Clip with Effects',
  render: () => {
    const engine = useMemo(() => {
      const eng = createMockEngine();
      eng.setSelectedClipIds(new Set(['clip-intro']));
      const clip = eng.getState().timeline.tracks[0]?.clips.find((c) => c.id === 'clip-intro');
      if (clip) {
        eng.dispatch({
          id: 'add-mock-fx',
          label: 'Add mock effects',
          timestamp: Date.now(),
          operations: [
            {
              type: 'SET_CLIP_METADATA',
              clipId: 'clip-intro' as ClipId,
              metadata: {
                ...clip.metadata,
                effects: [
                  createEffect('fx-1', 'blur', 'preComposite'),
                  createEffect('fx-2', 'brightness', 'preComposite'),
                ],
              },
            },
          ],
        });
      }
      return eng;
    }, []);

    return (
      <TimelineProvider engine={engine}>
        <div style={{ width: '320px', background: '#141419', border: '1px solid #2a2a36', borderRadius: '8px' }}>
          <EffectsPanel />
        </div>
      </TimelineProvider>
    );
  },
};

export const NoSelection: Story = {
  name: 'No Selection',
  render: () => {
    const engine = useMemo(() => createMockEngine(), []);
    return (
      <TimelineProvider engine={engine}>
        <div style={{ width: '320px', background: '#141419', border: '1px solid #2a2a36', borderRadius: '8px' }}>
          <EffectsPanel />
        </div>
      </TimelineProvider>
    );
  },
};
