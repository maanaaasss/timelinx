import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebAudioWaveformAdapter } from '../adapters/webaudio-waveform';

describe('WebAudioWaveformAdapter', () => {
  let adapter: WebAudioWaveformAdapter;

  beforeEach(() => {
    adapter = new WebAudioWaveformAdapter();
  });

  describe('constructor', () => {
    it('creates adapter with default config', () => {
      expect(adapter).toBeDefined();
    });

    it('creates adapter with custom config', () => {
      const custom = new WebAudioWaveformAdapter({
        sampleRate: 48000,
        channels: 2,
        peaksPerSecond: 40,
      });
      expect(custom).toBeDefined();
    });
  });

  describe('extractFromBuffer', () => {
    it('returns extraction result', async () => {
      // Mock AudioBuffer
      const mockBuffer = {
        duration: 1,
        numberOfChannels: 1,
        sampleRate: 44100,
        getChannelData: () => new Float32Array(44100),
      } as unknown as AudioBuffer;

      const result = await adapter.extractFromBuffer('asset-1' as any, mockBuffer);

      expect(result).toHaveProperty('assetId');
      expect(result).toHaveProperty('success');
      expect(result.assetId).toBe('asset-1');
    });
  });

  describe('clearCache', () => {
    it('does not throw', () => {
      expect(() => adapter.clearCache()).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('does not throw', async () => {
      await expect(adapter.destroy()).resolves.not.toThrow();
    });
  });
});
