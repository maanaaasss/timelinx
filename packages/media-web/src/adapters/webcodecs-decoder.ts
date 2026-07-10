/**
 * WebCodecs Video Decoder Adapter
 *
 * Implements the @timelinx/core VideoDecoder contract using the WebCodecs API.
 * Falls back gracefully when WebCodecs is not available.
 */

import type { VideoFrameRequest, VideoFrameResult } from '@timelinx/core';
import type { ClipId, TimelineFrame } from '@timelinx/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WebCodecsDecoderConfig = {
  /** Preferred codec string (e.g., 'vp09.00.10.08'). If omitted, auto-detects. */
  codec?: string;
  /** Hardware acceleration preference. Default: 'prefer-hardware'. */
  hardwareAcceleration?: HardwareAcceleration;
  /** Reserved for future concurrent decoder pool. Currently unused. */
  concurrency?: number;
};

type DecodedFrameCache = {
  clipId: ClipId;
  mediaFrame: TimelineFrame;
  frame: VideoFrame;
  timestamp: number;
};

// ---------------------------------------------------------------------------
// WebCodecsDecoder
// ---------------------------------------------------------------------------

export class WebCodecsDecoderAdapter {
  private config: WebCodecsDecoderConfig;
  private decoders: Map<string, VideoDecoder> = new Map();
  private frameCache: Map<string, DecodedFrameCache> = new Map();
  private supported: boolean;

  constructor(config: WebCodecsDecoderConfig = {}) {
    this.config = {
      codec: config.codec,
      hardwareAcceleration: config.hardwareAcceleration ?? 'prefer-hardware',
      concurrency: config.concurrency ?? 4,
    };
    this.supported = typeof VideoDecoder !== 'undefined';
  }

  /**
   * Check if WebCodecs is available in this environment.
   */
  isSupported(): boolean {
    return this.supported;
  }

  /**
   * Configure a decoder for a specific clip's codec string.
   */
  async configureDecoder(
    clipId: string,
    codec: string,
    codedWidth: number,
    codedHeight: number,
  ): Promise<void> {
    if (!this.supported) {
      throw new Error('WebCodecs VideoDecoder is not available in this environment');
    }

    // Close existing decoder for this codec if any
    const existingDecoder = this.decoders.get(codec);
    if (existingDecoder) {
      try {
        await existingDecoder.close();
      } catch {
        // Decoder may already be closed
      }
    }

    const decoder = new VideoDecoder({
      output: (frame: VideoFrame) => {
        // Frame will be retrieved via the promise-based API
      },
      error: (e: DOMException) => {
        console.error('VideoDecoder error:', e);
      },
    });

    decoder.configure({
      codec,
      codedWidth,
      codedHeight,
      hardwareAcceleration: this.config.hardwareAcceleration,
    });

    this.decoders.set(codec, decoder);
  }

  /**
   * Decode a video frame using WebCodecs.
   */
  async decode(request: VideoFrameRequest): Promise<VideoFrameResult> {
    const cacheKey = `${request.clipId}-${request.mediaFrame}`;

    // Check cache first
    const cached = this.frameCache.get(cacheKey);
    if (cached) {
      return {
        clipId: request.clipId,
        mediaFrame: request.mediaFrame,
        width: cached.frame.displayWidth,
        height: cached.frame.displayHeight,
        bitmap: cached.frame,
      };
    }

    if (!this.supported) {
      // Return a placeholder for environments without WebCodecs
      return this.createPlaceholderFrame(request);
    }

    // In a real implementation, this would decode from a media chunk
    // For now, return a placeholder
    return this.createPlaceholderFrame(request);
  }

  /**
   * Create a placeholder frame for demo/testing purposes.
   */
  private createPlaceholderFrame(request: VideoFrameRequest): VideoFrameResult {
    // Create a simple colored canvas as placeholder
    let canvas: OffscreenCanvas | null = null;
    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(640, 480);
    }

    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Different colors for different frames
        const hue = (request.mediaFrame as number * 2) % 360;
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.fillRect(0, 0, 640, 480);

        // Add frame number text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Frame ${request.mediaFrame}`, 320, 250);
      }
    }

    // Create a minimal bitmap placeholder
    let bitmap: unknown = canvas;
    if (!bitmap && typeof ImageData !== 'undefined') {
      bitmap = new ImageData(640, 480);
    }

    return {
      clipId: request.clipId,
      mediaFrame: request.mediaFrame,
      width: 640,
      height: 480,
      bitmap,
    };
  }

  /**
   * Clear the frame cache.
   */
  clearCache(): void {
    for (const entry of this.frameCache.values()) {
      if (entry.frame && typeof entry.frame.close === 'function') {
        entry.frame.close();
      }
    }
    this.frameCache.clear();
  }

  /**
   * Close all decoders and release resources.
   */
  async destroy(): Promise<void> {
    this.clearCache();
    for (const decoder of this.decoders.values()) {
      try {
        await decoder.close();
      } catch {
        // Decoder may already be closed
      }
    }
    this.decoders.clear();
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a WebCodecs decoder adapter with default configuration.
 */
export function createWebCodecsDecoder(
  config?: WebCodecsDecoderConfig,
): WebCodecsDecoderAdapter {
  return new WebCodecsDecoderAdapter(config);
}
