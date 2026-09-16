import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import {
  IconPlus,
  IconFilm,
  IconHeadphones,
  IconZoomIn,
  IconZoomOut,
  IconUndo,
  IconRedo,
  IconPlayerPlay,
  IconPlayerPause,
  IconCursor,
  IconRazor,
  IconHand,
  IconTrim,
  IconRoll,
  IconSlip,
  IconSlide,
  IconSnap,
  IconEye,
  IconEyeOff,
  IconLock,
  IconUnlock,
  IconVolume,
  IconVolumeOff,
} from '../components/icons';

const icons = [
  { name: 'IconPlus', Component: IconPlus },
  { name: 'IconFilm', Component: IconFilm },
  { name: 'IconHeadphones', Component: IconHeadphones },
  { name: 'IconZoomIn', Component: IconZoomIn },
  { name: 'IconZoomOut', Component: IconZoomOut },
  { name: 'IconUndo', Component: IconUndo },
  { name: 'IconRedo', Component: IconRedo },
  { name: 'IconPlayerPlay', Component: IconPlayerPlay },
  { name: 'IconPlayerPause', Component: IconPlayerPause },
  { name: 'IconCursor', Component: IconCursor },
  { name: 'IconRazor', Component: IconRazor },
  { name: 'IconHand', Component: IconHand },
  { name: 'IconTrim', Component: IconTrim },
  { name: 'IconRoll', Component: IconRoll },
  { name: 'IconSlip', Component: IconSlip },
  { name: 'IconSlide', Component: IconSlide },
  { name: 'IconSnap', Component: IconSnap },
  { name: 'IconEye', Component: IconEye },
  { name: 'IconEyeOff', Component: IconEyeOff },
  { name: 'IconLock', Component: IconLock },
  { name: 'IconUnlock', Component: IconUnlock },
  { name: 'IconVolume', Component: IconVolume },
  { name: 'IconVolumeOff', Component: IconVolumeOff },
];

const meta: Meta = {
  title: 'Components/Icons',
  tags: ['autodocs'],
};

export default meta;

const IconGrid = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      gap: '16px',
    }}
  >
    {icons.map(({ name, Component }) => (
      <div
        key={name}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          padding: '16px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Component size={24} />
        <span style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>{name}</span>
      </div>
    ))}
  </div>
);

export const AllIcons: StoryObj = {
  render: () => <IconGrid />,
};

export const Sizes: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      <IconPlayerPlay size={14} />
      <IconPlayerPlay size={20} />
      <IconPlayerPlay size={28} />
      <IconPlayerPlay size={36} />
    </div>
  ),
};
