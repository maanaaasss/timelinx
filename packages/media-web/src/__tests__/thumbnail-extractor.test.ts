import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { ThumbnailExtractorAdapter } from '../adapters/thumbnail-extractor';

// Mock OffscreenCanvas for Node.js environment
beforeAll(() => {
  if (typeof globalThis.OffscreenCanvas === 'undefined') {
    (globalThis as any).OffscreenCanvas = class OffscreenCanvas {
      width: number;
      height: number;
      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
      }
      getContext(type: string) {
        if (type === '2d') {
          return {
            fillStyle: '',
            fillRect: () => {},
            font: '',
            textAlign: '',
            textBaseline: '',
            fillText: () => {},
          };
        }
        return null;
      }
    };
  }
});

describe('ThumbnailExtractorAdapter', () => {
  let adapter: ThumbnailExtractorAdapter;

  beforeEach(() => {
    adapter = new ThumbnailExtractorAdapter();
  });

  describe('constructor', () => {
    it('creates adapter with default config', () => {
      expect(adapter).toBeDefined();
    });

    it('creates adapter with custom config', () => {
      const custom = new ThumbnailExtractorAdapter({
        defaultWidth: 320,
        defaultHeight: 180,
        concurrency: 8,
        cacheSize: 1000,
      });
      expect(custom).toBeDefined();
    });
  });

  describe('getThumbnail', () => {
    it('returns a ThumbnailResult', async () => {
      const result = await adapter.getThumbnail({
        clipId: 'clip-1' as any,
        mediaFrame: 0 as any,
        width: 160,
        height: 90,
      });

      expect(result).toHaveProperty('clipId');
      expect(result).toHaveProperty('mediaFrame');
      expect(result).toHaveProperty('bitmap');
      expect(result.clipId).toBe('clip-1');
      expect(result.mediaFrame).toBe(0);
    });
  });

  describe('extractThumbnail', () => {
    it('returns cached result on second call', async () => {
      const request = {
        clipId: 'clip-1' as any,
        mediaFrame: 10 as any,
        width: 160,
        height: 90,
      };

      const result1 = await adapter.extractThumbnail(request);
      const result2 = await adapter.extractThumbnail(request);

      // Should return same cached object
      expect(result1.bitmap).toBe(result2.bitmap);
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
