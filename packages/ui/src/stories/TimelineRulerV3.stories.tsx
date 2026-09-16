import type { Meta, StoryObj } from '@storybook/react';
import React, { useState, useCallback, useRef } from 'react';
import { TimelineRulerV3 } from '../components/timeline/timeline-ruler-v3';
import { RulerPlayheadV3 } from '../components/timeline/ruler-playhead-v3';

const meta: Meta<typeof TimelineRulerV3> = {
  title: 'Timeline/TimelineRulerV3',
  component: TimelineRulerV3,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TimelineRulerV3>;

export const Default: Story = {
  render: () => {
    const [currentTime, setCurrentTime] = useState(300);
    return (
      <div style={{ width: '100%', overflow: 'hidden' }}>
        <TimelineRulerV3
          fps={30}
          ppf={10}
          duration={3000}
          currentTime={currentTime}
          onSeek={setCurrentTime}
        />
      </div>
    );
  },
};

export const ZoomedIn: Story = {
  render: () => {
    const [currentTime, setCurrentTime] = useState(150);
    return (
      <div style={{ width: '100%', overflow: 'hidden' }}>
        <TimelineRulerV3
          fps={30}
          ppf={30}
          duration={900}
          currentTime={currentTime}
          onSeek={setCurrentTime}
        />
      </div>
    );
  },
};

export const WithInOutPoints: Story = {
  render: () => {
    const [currentTime, setCurrentTime] = useState(450);
    return (
      <div style={{ width: '100%', overflow: 'hidden' }}>
        <TimelineRulerV3
          fps={30}
          ppf={10}
          duration={3000}
          currentTime={currentTime}
          onSeek={setCurrentTime}
          inPoint={300}
          outPoint={1500}
        />
      </div>
    );
  },
};

export const PlayheadOnly: Story = {
  render: () => {
    const [time, setTime] = useState(600);
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '40px',
          background: '#18181e',
          overflow: 'hidden',
        }}
      >
        <RulerPlayheadV3
          currentTime={time}
          ppf={10}
          scrollLeft={0}
          duration={3000}
          onSeek={setTime}
        />
      </div>
    );
  },
};
