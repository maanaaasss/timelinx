import { describe, it, expect } from 'vitest';
import {
  WebCodecsDecoderAdapter,
  createWebCodecsDecoder,
  WebAudioWaveformAdapter,
  createWebAudioWaveform,
  ThumbnailExtractorAdapter,
  createThumbnailExtractor,
  SimpleExportAdapter,
  createSimpleExporter,
  WebGLCompositorAdapter,
  isWebCodecsSupported,
  isWebAudioSupported,
  isWebGLSupported,
  isOffscreenCanvasSupported,
  isCaptureStreamSupported,
  getBrowserMediaCapabilities,
} from '../index';

describe('@timelinx/media-web', () => {
  describe('Adapters', () => {
    it('exports WebCodecsDecoderAdapter', () => {
      expect(WebCodecsDecoderAdapter).toBeDefined();
      expect(typeof WebCodecsDecoderAdapter).toBe('function');
    });

    it('exports createWebCodecsDecoder factory', () => {
      expect(createWebCodecsDecoder).toBeDefined();
      expect(typeof createWebCodecsDecoder).toBe('function');
    });

    it('exports WebAudioWaveformAdapter', () => {
      expect(WebAudioWaveformAdapter).toBeDefined();
      expect(typeof WebAudioWaveformAdapter).toBe('function');
    });

    it('exports createWebAudioWaveform factory', () => {
      expect(createWebAudioWaveform).toBeDefined();
      expect(typeof createWebAudioWaveform).toBe('function');
    });

    it('exports ThumbnailExtractorAdapter', () => {
      expect(ThumbnailExtractorAdapter).toBeDefined();
      expect(typeof ThumbnailExtractorAdapter).toBe('function');
    });

    it('exports createThumbnailExtractor factory', () => {
      expect(createThumbnailExtractor).toBeDefined();
      expect(typeof createThumbnailExtractor).toBe('function');
    });

    it('exports SimpleExportAdapter', () => {
      expect(SimpleExportAdapter).toBeDefined();
      expect(typeof SimpleExportAdapter).toBe('function');
    });

    it('exports createSimpleExporter factory', () => {
      expect(createSimpleExporter).toBeDefined();
      expect(typeof createSimpleExporter).toBe('function');
    });

    it('exports WebGLCompositorAdapter', () => {
      expect(WebGLCompositorAdapter).toBeDefined();
      expect(typeof WebGLCompositorAdapter).toBe('function');
    });
  });

  describe('Utilities', () => {
    it('exports isWebCodecsSupported', () => {
      expect(isWebCodecsSupported).toBeDefined();
      expect(typeof isWebCodecsSupported).toBe('function');
    });

    it('exports isWebAudioSupported', () => {
      expect(isWebAudioSupported).toBeDefined();
      expect(typeof isWebAudioSupported).toBe('function');
    });

    it('exports isWebGLSupported', () => {
      expect(isWebGLSupported).toBeDefined();
      expect(typeof isWebGLSupported).toBe('function');
    });

    it('exports isOffscreenCanvasSupported', () => {
      expect(isOffscreenCanvasSupported).toBeDefined();
      expect(typeof isOffscreenCanvasSupported).toBe('function');
    });

    it('exports isCaptureStreamSupported', () => {
      expect(isCaptureStreamSupported).toBeDefined();
      expect(typeof isCaptureStreamSupported).toBe('function');
    });

    it('exports getBrowserMediaCapabilities', () => {
      expect(getBrowserMediaCapabilities).toBeDefined();
      expect(typeof getBrowserMediaCapabilities).toBe('function');
    });

    it('getBrowserMediaCapabilities returns expected shape', () => {
      const caps = getBrowserMediaCapabilities();
      expect(caps).toHaveProperty('webCodecs');
      expect(caps).toHaveProperty('webAudio');
      expect(caps).toHaveProperty('webgl');
      expect(caps).toHaveProperty('offscreenCanvas');
      expect(caps).toHaveProperty('captureStream');
    });
  });

  describe('Factory functions', () => {
    it('createWebCodecsDecoder returns adapter instance', () => {
      const adapter = createWebCodecsDecoder();
      expect(adapter).toBeInstanceOf(WebCodecsDecoderAdapter);
    });

    it('createWebAudioWaveform returns adapter instance', () => {
      const adapter = createWebAudioWaveform();
      expect(adapter).toBeInstanceOf(WebAudioWaveformAdapter);
    });

    it('createThumbnailExtractor returns adapter instance', () => {
      const adapter = createThumbnailExtractor();
      expect(adapter).toBeInstanceOf(ThumbnailExtractorAdapter);
    });

    it('createSimpleExporter returns adapter instance', () => {
      const adapter = createSimpleExporter();
      expect(adapter).toBeInstanceOf(SimpleExportAdapter);
    });
  });
});
