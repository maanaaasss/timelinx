/**
 * Thumbnail Worker
 *
 * Off-main-thread thumbnail extraction using Web Workers.
 * Processes video frames in a separate thread for better performance.
 */

import type { ClipId, TimelineFrame } from '@timelinx/core';

// ---------------------------------------------------------------------------
// Worker Types (duplicated from core for worker context)
// ---------------------------------------------------------------------------

export type ThumbnailRequest = {
  readonly clipId: ClipId;
  readonly mediaFrame: TimelineFrame;
  readonly width: number;
  readonly height: number;
  readonly time: number;
};

export type ThumbnailResult = {
  readonly clipId: ClipId;
  readonly mediaFrame: TimelineFrame;
  readonly bitmap: ImageBitmap | ImageData;
};

export type ThumbnailPriority = 'low' | 'normal' | 'high';

export type ThumbnailQueueEntry = {
  readonly request: ThumbnailRequest;
  readonly priority: ThumbnailPriority;
  readonly addedAt: number;
};

export type ThumbnailWorkerMessage =
  | { type: 'request'; payload: ThumbnailQueueEntry }
  | { type: 'cancel'; clipId: string; mediaFrame: number }
  | { type: 'set-priority'; clipId: string; mediaFrame: number; priority: ThumbnailPriority };

export type ThumbnailWorkerResponse =
  | { type: 'result'; payload: ThumbnailResult }
  | { type: 'error'; requestId: string; message: string }
  | { type: 'progress'; requestId: string; progress: number };

// ---------------------------------------------------------------------------
// Worker Implementation
// ---------------------------------------------------------------------------

/**
 * Thumbnail extraction worker for use in Web Worker context.
 */
export function createThumbnailWorker(): void {
  if (typeof self === 'undefined' || typeof document !== 'undefined') {
    console.warn('createThumbnailWorker should be called in a Web Worker context');
    return;
  }

  const pendingRequests = new Map<string, ThumbnailQueueEntry>();

  self.onmessage = async (event: MessageEvent<ThumbnailWorkerMessage>) => {
    const { type } = event.data;

    try {
      switch (type) {
        case 'request': {
          const key = `${event.data.payload.request.clipId}-${event.data.payload.request.mediaFrame}`;
          pendingRequests.set(key, event.data.payload);
          await handleThumbnailRequest(event.data.payload);
          pendingRequests.delete(key);
          break;
        }
        case 'cancel': {
          const key = `${event.data.clipId}-${event.data.mediaFrame}`;
          pendingRequests.delete(key);
          break;
        }
        case 'set-priority':
          break;
      }
    } catch (error) {
      self.postMessage({
        type: 'error',
        requestId: type === 'request' ? `${event.data.payload.request.clipId}-${event.data.payload.request.mediaFrame}` : 'unknown',
        message: error instanceof Error ? error.message : 'Worker error',
      });
    }
  };
}

/**
 * Handle a thumbnail extraction request.
 */
async function handleThumbnailRequest(entry: ThumbnailQueueEntry): Promise<void> {
  const { request } = entry;

  try {
    // Extract thumbnail
    const thumbnail = await extractThumbnail(request);

    const result: ThumbnailResult = {
      clipId: request.clipId,
      mediaFrame: request.mediaFrame,
      bitmap: thumbnail,
    };

    const response: ThumbnailWorkerResponse = {
      type: 'result',
      payload: result,
    };

    self.postMessage(response, [result.bitmap as unknown as Transferable]);
  } catch (error) {
    const response: ThumbnailWorkerResponse = {
      type: 'error',
      requestId: `${request.clipId}-${request.mediaFrame}`,
      message: error instanceof Error ? error.message : 'Extraction failed',
    };

    self.postMessage(response);
  }
}

/**
 * Extract a thumbnail from video.
 * This is a placeholder implementation.
 */
async function extractThumbnail(
  request: ThumbnailRequest,
): Promise<ImageBitmap | ImageData> {
  const { width, height, mediaFrame } = request;

  // Create a placeholder thumbnail
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Draw gradient based on frame
      const hue = ((mediaFrame as number) * 5) % 360;
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, `hsl(${hue}, 70%, 40%)`);
      gradient.addColorStop(1, `hsl(${(hue + 60) % 360}, 70%, 50%)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Add frame number
      ctx.fillStyle = 'white';
      ctx.font = `bold ${Math.floor(height / 3)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${mediaFrame}`, width / 2, height / 2);

      // Convert to ImageBitmap
      return createImageBitmap(canvas);
    }
  }

  // Fallback to ImageData
  const data = new Uint8ClampedArray(width * height * 4);
  const hue = ((mediaFrame as number) * 5) % 360;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = Math.floor((hue / 360) * 255);     // R
      data[idx + 1] = 128;                             // G
      data[idx + 2] = 128;                             // B
      data[idx + 3] = 255;                             // A
    }
  }

  return new ImageData(data, width, height);
}

// ---------------------------------------------------------------------------
// Worker Client (for main thread)
// ---------------------------------------------------------------------------

export type ThumbnailWorkerClientConfig = {
  /** Worker script URL or module. */
  workerUrl: string | URL;
  /** Number of workers to create. Default: 2. */
  poolSize?: number;
  /** Maximum queue size. Default: 1000. */
  maxQueueSize?: number;
};

/**
 * Client for managing thumbnail worker pool from the main thread.
 */
export class ThumbnailWorkerClient {
  private config: ThumbnailWorkerClientConfig;
  private workers: Worker[] = [];
  private queue: ThumbnailQueueEntry[] = [];
  private processing: Map<string, ThumbnailQueueEntry> = new Map();
  private nextWorkerIndex: number = 0;

  constructor(config: ThumbnailWorkerClientConfig) {
    this.config = {
      workerUrl: config.workerUrl,
      poolSize: config.poolSize ?? 2,
      maxQueueSize: config.maxQueueSize ?? 1000,
    };

    for (let i = 0; i < (this.config.poolSize ?? 2); i++) {
      const worker = new Worker(config.workerUrl, { type: 'module' });
      worker.onmessage = (event) => this.handleWorkerMessage(worker, event);
      this.workers.push(worker);
    }
  }

  /**
   * Request a thumbnail extraction.
   */
  requestThumbnail(
    request: ThumbnailRequest,
    priority: ThumbnailPriority = 'normal',
  ): void {
    const entry: ThumbnailQueueEntry = {
      request,
      priority,
      addedAt: Date.now(),
    };

    // Check queue size limit
    if (this.queue.length >= (this.config.maxQueueSize ?? 1000)) {
      // Remove lowest priority item
      const lowestPriorityIndex = this.findLowestPriorityIndex();
      if (lowestPriorityIndex >= 0) {
        this.queue.splice(lowestPriorityIndex, 1);
      }
    }

    this.queue.push(entry);
    this.sortQueue();
    this.processQueue();
  }

  /**
   * Cancel a pending thumbnail request.
   */
  cancelRequest(clipId: string, mediaFrame: number): void {
    const key = `${clipId}-${mediaFrame}`;

    // Remove from queue
    this.queue = this.queue.filter(
      (entry) => `${entry.request.clipId}-${entry.request.mediaFrame}` !== key,
    );

    // Cancel if processing
    this.processing.delete(key);
  }

  /**
   * Process the queue.
   */
  private processQueue(): void {
    while (this.queue.length > 0 && this.processing.size < this.workers.length) {
      const entry = this.queue.shift()!;
      const worker = this.workers[this.nextWorkerIndex];
      this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;

      const key = `${entry.request.clipId}-${entry.request.mediaFrame}`;
      this.processing.set(key, entry);

      const message: ThumbnailWorkerMessage = {
        type: 'request',
        payload: entry,
      };

      worker.postMessage(message);
    }
  }

  /**
   * Handle worker messages.
   */
  private handleWorkerMessage(
    worker: Worker,
    event: MessageEvent<ThumbnailWorkerResponse>,
  ): void {
    const { type } = event.data;

    if (type === 'result') {
      const { clipId, mediaFrame } = event.data.payload;
      const key = `${clipId}-${mediaFrame}`;
      this.processing.delete(key);
      this.processQueue();
    } else if (type === 'error') {
      this.processing.delete(event.data.requestId);
      this.processQueue();
    }
  }

  /**
   * Find the index of the lowest priority item.
   */
  private findLowestPriorityIndex(): number {
    const priorityOrder = { low: 0, normal: 1, high: 2 };
    let lowestIndex = -1;
    let lowestPriority = Infinity;

    for (let i = 0; i < this.queue.length; i++) {
      const priority = priorityOrder[this.queue[i].priority] ?? 0;
      if (priority < lowestPriority) {
        lowestPriority = priority;
        lowestIndex = i;
      }
    }

    return lowestIndex;
  }

  /**
   * Sort queue by priority (high first).
   */
  private sortQueue(): void {
    const priorityOrder = { high: 2, normal: 1, low: 0 };
    this.queue.sort(
      (a, b) => (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0),
    );
  }

  /**
   * Terminate all workers.
   */
  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.queue = [];
    this.processing.clear();
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a thumbnail worker client.
 */
export function createThumbnailWorkerClient(
  config: ThumbnailWorkerClientConfig,
): ThumbnailWorkerClient {
  return new ThumbnailWorkerClient(config);
}
