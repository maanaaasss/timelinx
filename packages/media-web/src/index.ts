/**
 * @timelinx/media-web
 *
 * Web-native media adapters for @timelinx/core.
 * Provides WebCodecs, WebAudio, thumbnails, and export capabilities.
 */

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

export {
  WebCodecsDecoderAdapter,
  createWebCodecsDecoder,
} from './adapters/webcodecs-decoder';

export type {
  WebCodecsDecoderConfig,
} from './adapters/webcodecs-decoder';

export {
  WebAudioWaveformAdapter,
  createWebAudioWaveform,
} from './adapters/webaudio-waveform';

export type {
  WaveformConfig,
  WaveformPeak,
  WaveformData,
  WaveformExtractionResult,
} from './adapters/webaudio-waveform';

export {
  ThumbnailExtractorAdapter,
  createThumbnailExtractor,
} from './adapters/thumbnail-extractor';

export type {
  ThumbnailConfig,
} from './adapters/thumbnail-extractor';

export {
  SimpleExportAdapter,
  createSimpleExporter,
} from './adapters/simple-export';

export type {
  ExportFormat,
  ExportConfig,
  ExportProgress,
  ExportResult,
} from './adapters/simple-export';

export {
  WebGLCompositorAdapter,
  createWebGLCompositor,
} from './adapters/webgl-compositor';

export type {
  WebGLCompositorConfig,
} from './adapters/webgl-compositor';

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Check if WebCodecs is available in this environment.
 */
export function isWebCodecsSupported(): boolean {
  return typeof VideoDecoder !== 'undefined';
}

/**
 * Check if Web Audio API is available.
 */
export function isWebAudioSupported(): boolean {
  return typeof AudioContext !== 'undefined';
}

/**
 * Check if WebGL is available.
 */
export function isWebGLSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
  if (gl) {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  return !!gl;
}

/**
 * Check if OffscreenCanvas is available.
 */
export function isOffscreenCanvasSupported(): boolean {
  return typeof OffscreenCanvas !== 'undefined';
}

/**
 * Check if captureStream is available.
 */
export function isCaptureStreamSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  return typeof canvas.captureStream === 'function';
}

/**
 * Get browser media capabilities.
 */
export function getBrowserMediaCapabilities(): {
  webCodecs: boolean;
  webAudio: boolean;
  webgl: boolean;
  offscreenCanvas: boolean;
  captureStream: boolean;
} {
  return {
    webCodecs: isWebCodecsSupported(),
    webAudio: isWebAudioSupported(),
    webgl: isWebGLSupported(),
    offscreenCanvas: isOffscreenCanvasSupported(),
    captureStream: isCaptureStreamSupported(),
  };
}
