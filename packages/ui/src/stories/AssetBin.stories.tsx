import type { Meta, StoryObj } from '@storybook/react';
import React, { useMemo } from 'react';
import { AssetBin } from '../components/asset-bin';
import { TimelineProvider } from '../context/timeline-context';
import { MediaAssetsProvider } from '../context/media-assets-context';
import { createMockEngine } from './helpers/mock-engine';
import { createAsset, toFrame, frameRate, toAssetId } from '@timelinx/core';

const meta: Meta<typeof AssetBin> = {
  title: 'Panels/AssetBin',
  component: AssetBin,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AssetBin>;

export const DefaultWithAssets: Story = {
  name: 'Default with Registered Assets',
  render: () => {
    const engine = useMemo(() => {
      const eng = createMockEngine();
      // Register mock assets
      eng.dispatch({
        id: 'reg-1',
        label: 'Register assets',
        timestamp: Date.now(),
        operations: [
          {
            type: 'REGISTER_ASSET',
            asset: createAsset({
              id: toAssetId('asset-interview'),
              name: 'Interview_Aroll_4K.mp4',
              mediaType: 'video',
              filePath: '/assets/interview.mp4',
              intrinsicDuration: toFrame(1800),
              nativeFps: frameRate(30),
              sourceTimecodeOffset: toFrame(0),
            }),
          },
          {
            type: 'REGISTER_ASSET',
            asset: createAsset({
              id: toAssetId('asset-broll'),
              name: 'Cityscape_Broll.mp4',
              mediaType: 'video',
              filePath: '/assets/cityscape.mp4',
              intrinsicDuration: toFrame(900),
              nativeFps: frameRate(30),
              sourceTimecodeOffset: toFrame(0),
            }),
          },
          {
            type: 'REGISTER_ASSET',
            asset: createAsset({
              id: toAssetId('asset-music'),
              name: 'Cinematic_Background_Theme.wav',
              mediaType: 'audio',
              filePath: '/assets/theme.wav',
              intrinsicDuration: toFrame(3600),
              nativeFps: frameRate(30),
              sourceTimecodeOffset: toFrame(0),
            }),
          },
        ],
      });
      return eng;
    }, []);

    return (
      <TimelineProvider engine={engine}>
        <MediaAssetsProvider>
          <div style={{ width: '360px', height: '480px', background: '#141419', border: '1px solid #2a2a36', borderRadius: '8px' }}>
            <AssetBin />
          </div>
        </MediaAssetsProvider>
      </TimelineProvider>
    );
  },
};

export const EmptyBin: Story = {
  name: 'Empty Asset Bin',
  render: () => {
    const engine = useMemo(() => createMockEngine(), []);
    return (
      <TimelineProvider engine={engine}>
        <MediaAssetsProvider>
          <div style={{ width: '360px', height: '320px', background: '#141419', border: '1px solid #2a2a36', borderRadius: '8px' }}>
            <AssetBin />
          </div>
        </MediaAssetsProvider>
      </TimelineProvider>
    );
  },
};
