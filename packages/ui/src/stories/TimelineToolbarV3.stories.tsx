import type { Meta, StoryObj } from '@storybook/react';
import React, { useState, useCallback } from 'react';
import { TimelineToolbarV3 } from '../components/timeline/timeline-toolbar-v3';

const meta: Meta<typeof TimelineToolbarV3> = {
  title: 'Timeline/TimelineToolbarV3',
  component: TimelineToolbarV3,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TimelineToolbarV3>;

export const Default: Story = {
  render: () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [zoom, setZoom] = useState(10);
    return (
      <TimelineToolbarV3
        currentTime={300}
        duration={3000}
        fps={30}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying((p) => !p)}
        onSkipBack={() => {}}
        onSkipForward={() => {}}
        onCut={() => {}}
        onDelete={() => {}}
        zoom={zoom}
        zoomMin={2}
        zoomMax={50}
        onZoomChange={setZoom}
        onZoomFit={() => setZoom(10)}
      />
    );
  },
};

export const WithPages: Story = {
  render: () => {
    const [activePage, setActivePage] = useState('page-1');
    const [isPlaying, setIsPlaying] = useState(false);
    return (
      <TimelineToolbarV3
        currentTime={900}
        duration={3000}
        fps={30}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying((p) => !p)}
        onSkipBack={() => {}}
        onSkipForward={() => {}}
        onCut={() => {}}
        onDelete={() => {}}
        pages={[
          { id: 'page-1', name: 'Main Edit' },
          { id: 'page-2', name: 'Color Grade' },
          { id: 'page-3', name: 'VFX' },
        ]}
        activePage={activePage}
        onPageChange={setActivePage}
        zoom={10}
        zoomMin={2}
        zoomMax={50}
        onZoomChange={() => {}}
        onZoomFit={() => {}}
      />
    );
  },
};

export const TimecodeFormat: Story = {
  render: () => (
    <TimelineToolbarV3
      currentTime={1500}
      duration={3000}
      fps={30}
      timeFormat="timecode"
      isPlaying={false}
      zoom={10}
      zoomMin={2}
      zoomMax={50}
      onZoomChange={() => {}}
    />
  ),
};
