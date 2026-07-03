import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebCodecsDecoderAdapter } from '../adapters/webcodecs-decoder';

describe('WebCodecsDecoderAdapter', () => {
  let adapter: WebCodecsDecoderAdapter;

  beforeEach(() => {
    adapter = new WebCodecsDecoderAdapter();
  });

  describe('isSupported', () => {
    it('returns a boolean', () => {
      const result = adapter.isSupported();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('decode', () => {
    it('returns a VideoFrameResult', async () => {
      const result = await adapter.decode({
        clipId: 'clip-1' as any,
        mediaFrame: 0 as any,
        quality: 'normal',
      });

      expect(result).toHaveProperty('clipId');
      expect(result).toHaveProperty('mediaFrame');
      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
      expect(result).toHaveProperty('bitmap');
    });

    it('includes correct clipId and mediaFrame', async () => {
      const result = await adapter.decode({
        clipId: 'clip-test' as any,
        mediaFrame: 42 as any,
        quality: 'high',
      });

      expect(result.clipId).toBe('clip-test');
      expect(result.mediaFrame).toBe(42);
    });
  });

  describe('clearCache', () => {
    it('does not throw', async () => {
      await adapter.decode({
        clipId: 'clip-1' as any,
        mediaFrame: 0 as any,
        quality: 'normal',
      });

      expect(() => adapter.clearCache()).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('does not throw', async () => {
      await expect(adapter.destroy()).resolves.not.toThrow();
    });
  });
});
