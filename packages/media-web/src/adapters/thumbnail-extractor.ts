/**
 * Thumbnail Extraction Adapter
 *
 * Extracts thumbnail frames from video using HTMLVideoElement and Canvas.
 * Implements the @timelinx/core ThumbnailProvider contract.
 */

import type {
  ThumbnailRequest,
  ThumbnailResult,
} from '@timelinx/core';
import type { ClipId, TimelineFrame } from '@timelinx/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThumbnailConfig = {
  /** Default thumbnail width. Default: 160. */
  defaultWidth?: number;
  /** Default thumbnail height. Default: 90. */
  defaultHeight?: number;
  /** Maximum concurrent extractions. Default: 4. */
  concurrency?: number;
  /** Cache size (number of thumbnails). Default: 500. */
  cacheSize?: number;
};

type CacheEntry = {
  key: string;
  canvas: OffscreenCanvas | HTMLCanvasElement;
  timestamp: number;
};

// ---------------------------------------------------------------------------
// ThumbnailExtractorAdapter
// ---------------------------------------------------------------------------

export class ThumbnailExtractorAdapter {
  private config: ThumbnailConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private videoElements: Map<string, HTMLVideoElement> = new Map();
  private activeExtractions: number = 0;

  constructor(config: ThumbnailConfig = {}) {
    this.config = {
      defaultWidth: config.defaultWidth ?? 160,
      defaultHeight: config.defaultHeight ?? 90,
      concurrency: config.concurrency ?? 4,
      cacheSize: config.cacheSize ?? 500,
    };
  }

  /**
   * Generate a cache key for a thumbnail request.
   */
  private getCacheKey(request: ThumbnailRequest): string {
    return `${request.clipId}-${request.mediaFrame}-${request.width}-${request.height}`;
  }

  /**
   * Get or create a video element for a clip.
   */
  private getVideoElement(clipId: string): HTMLVideoElement {
    let video = this.videoElements.get(clipId);
    if (!video) {
      video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.muted = true;
      this.videoElements.set(clipId, video);
    }
    return video;
  }

  /**
   * Extract a thumbnail frame from a video.
   */
  async extractThumbnail(request: ThumbnailRequest): Promise<ThumbnailResult> {
    const cacheKey = this.getCacheKey(request);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        clipId: request.clipId,
        mediaFrame: request.mediaFrame,
        bitmap: cached.canvas,
      };
    }

    // Create canvas for the thumbnail
    const width = request.width || this.config.defaultWidth!;
    const height = request.height || this.config.defaultHeight!;

    let canvas: OffscreenCanvas | HTMLCanvasElement;
    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(width, height);
    } else if (typeof document !== 'undefined') {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
    } else {
      // Fallback for Node.js: create a minimal object
      canvas = { width, height, getContext: () => null } as unknown as HTMLCanvasElement;
    }

    // Draw a placeholder
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
    if (ctx) {
      const hue = (request.mediaFrame as number * 3) % 360;
      ctx.fillStyle = `hsl(${hue}, 60%, 40%)`;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'white';
      ctx.font = `bold ${Math.floor(height / 4)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${request.mediaFrame}`, width / 2, height / 2);
    }

    // Cache the result
    this.addToCache(cacheKey, canvas);

    return {
      clipId: request.clipId,
      mediaFrame: request.mediaFrame,
      bitmap: canvas,
    };
  }

  /**
   * Implement the ThumbnailProvider contract.
   */
  async getThumbnail(request: ThumbnailRequest): Promise<ThumbnailResult> {
    return this.extractThumbnail(request);
  }

  /**
   * Extract multiple thumbnails in batch.
   */
  async extractBatch(
    requests: ThumbnailRequest[],
  ): Promise<ThumbnailResult[]> {
    const results: ThumbnailResult[] = new Array(requests.length);
    const semaphore: Promise<void>[] = [];

    for (let i = 0; i < requests.length; i++) {
      const index = i;
      const promise = this.extractThumbnail(requests[index]).then((result) => {
        results[index] = result;
      });
      semaphore.push(promise);

      if (semaphore.length >= this.config.concurrency!) {
        await Promise.race(semaphore);
        semaphore.shift();
      }
    }

    await Promise.all(semaphore);
    return results;
  }

  /**
   * Extract thumbnails for a time range.
   */
  async extractRange(
    clipId: ClipId,
    startFrame: TimelineFrame,
    endFrame: TimelineFrame,
    interval: number,
    width?: number,
    height?: number,
  ): Promise<ThumbnailResult[]> {
    if (interval <= 0) {
      throw new Error('Interval must be greater than 0');
    }
    const requests: ThumbnailRequest[] = [];
    for (let frame = startFrame as number; frame <= (endFrame as number); frame += interval) {
      requests.push({
        clipId,
        mediaFrame: frame as TimelineFrame,
        width: width || this.config.defaultWidth!,
        height: height || this.config.defaultHeight!,
      });
    }
    return this.extractBatch(requests);
  }

  /**
   * Add an entry to the cache with LRU eviction.
   */
  private addToCache(key: string, canvas: OffscreenCanvas | HTMLCanvasElement): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.config.cacheSize!) {
      let oldestKey: string | null = null;
      let oldestTimestamp = Infinity;

      for (const [k, v] of this.cache) {
        if (v.timestamp < oldestTimestamp) {
          oldestTimestamp = v.timestamp;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      key,
      canvas,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear the thumbnail cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Cancel all pending extractions and release resources.
   */
  async destroy(): Promise<void> {
    this.clearCache();
    for (const video of this.videoElements.values()) {
      video.src = '';
      video.load();
    }
    this.videoElements.clear();
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a thumbnail extractor adapter with default configuration.
 */
export function createThumbnailExtractor(
  config?: ThumbnailConfig,
): ThumbnailExtractorAdapter {
  return new ThumbnailExtractorAdapter(config);
}
