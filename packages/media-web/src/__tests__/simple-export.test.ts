import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SimpleExportAdapter } from '../adapters/simple-export';

describe('SimpleExportAdapter', () => {
  let adapter: SimpleExportAdapter;

  beforeEach(() => {
    adapter = new SimpleExportAdapter();
  });

  describe('constructor', () => {
    it('creates adapter with default config', () => {
      expect(adapter).toBeDefined();
    });

    it('creates adapter with custom config', () => {
      const custom = new SimpleExportAdapter({
        format: 'mp4',
        videoBitrate: 5000000,
        frameRate: 60,
        width: 3840,
        height: 2160,
      });
      expect(custom).toBeDefined();
    });
  });

  describe('isFormatSupported', () => {
    it('returns boolean for webm', () => {
      const result = SimpleExportAdapter.isFormatSupported('webm');
      expect(typeof result).toBe('boolean');
    });

    it('returns boolean for mp4', () => {
      const result = SimpleExportAdapter.isFormatSupported('mp4');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('isCurrentlyExporting', () => {
    it('returns false initially', () => {
      expect(adapter.isCurrentlyExporting()).toBe(false);
    });
  });

  describe('cancelExport', () => {
    it('does not throw when not exporting', () => {
      expect(() => adapter.cancelExport()).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('does not throw', () => {
      expect(() => adapter.destroy()).not.toThrow();
    });
  });
});
