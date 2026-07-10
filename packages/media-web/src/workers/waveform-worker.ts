/**
 * Waveform Worker
 *
 * Off-main-thread waveform extraction using Web Workers.
 * Processes audio data in a separate thread for better performance.
 */

import type { AssetId, TimelineFrame } from '@timelinx/core';

// ---------------------------------------------------------------------------
// Worker Types (duplicated from core for worker context)
// ---------------------------------------------------------------------------

export type WaveformRequest = {
  readonly requestId: string;
  readonly assetId: AssetId;
  readonly channel: number;
  readonly startFrame: TimelineFrame;
  readonly endFrame: TimelineFrame;
  readonly buckets: number;
  readonly sampleRate: number;
};

export type WaveformPeak = {
  readonly min: number;
  readonly max: number;
  readonly rms: number;
};

export type WaveformResult = {
  readonly requestId: string;
  readonly assetId: AssetId;
  readonly peaks: readonly WaveformPeak[];
  readonly error?: string;
};

export type WaveformWorkerMessage =
  | { type: 'request'; payload: WaveformRequest }
  | { type: 'cancel'; requestId: string };

export type WaveformWorkerResponse =
  | { type: 'result'; payload: WaveformResult }
  | { type: 'progress'; requestId: string; progress: number }
  | { type: 'error'; requestId: string; message: string };

// ---------------------------------------------------------------------------
// Worker Implementation
// ---------------------------------------------------------------------------

/**
 * Waveform extraction worker for use in Web Worker context.
 */
export function createWaveformWorker(): void {
  // Check if we're in a worker context
  if (typeof self === 'undefined' || typeof document !== 'undefined') {
    console.warn('createWaveformWorker should be called in a Web Worker context');
    return;
  }

  const pendingRequests = new Map<string, WaveformRequest>();

  self.onmessage = async (event: MessageEvent<WaveformWorkerMessage>) => {
    const { type } = event.data;

    try {
      switch (type) {
        case 'request': {
          pendingRequests.set(event.data.payload.requestId, event.data.payload);
          await handleWaveformRequest(event.data.payload);
          pendingRequests.delete(event.data.payload.requestId);
          break;
        }
        case 'cancel': {
          pendingRequests.delete(event.data.requestId);
          break;
        }
      }
    } catch (error) {
      self.postMessage({
        type: 'error',
        requestId: type === 'request' ? event.data.payload.requestId : 'unknown',
        message: error instanceof Error ? error.message : 'Worker error',
      });
    }
  };
}

/**
 * Handle a waveform extraction request.
 */
async function handleWaveformRequest(request: WaveformRequest): Promise<void> {
  const response: WaveformWorkerResponse = {
    type: 'progress',
    requestId: request.requestId,
    progress: 0,
  };

  self.postMessage(response);

  try {
    // Simulate waveform extraction
    // In a real implementation, this would decode audio and extract peaks
    const peaks = await extractWaveformPeaks(request);

    const result: WaveformResult = {
      requestId: request.requestId,
      assetId: request.assetId,
      peaks,
    };

    const successResponse: WaveformWorkerResponse = {
      type: 'result',
      payload: result,
    };

    self.postMessage(successResponse);
  } catch (error) {
    const errorResponse: WaveformWorkerResponse = {
      type: 'error',
      requestId: request.requestId,
      message: error instanceof Error ? error.message : 'Extraction failed',
    };

    self.postMessage(errorResponse);
  }
}

/**
 * Extract waveform peaks from audio data.
 * This is a placeholder implementation.
 */
async function extractWaveformPeaks(
  request: WaveformRequest,
): Promise<WaveformPeak[]> {
  const { buckets } = request;
  const peaks: WaveformPeak[] = [];

  // Simulate peak extraction
  for (let i = 0; i < buckets; i++) {
    const progress = i / buckets;

    // Report progress
    const progressResponse: WaveformWorkerResponse = {
      type: 'progress',
      requestId: request.requestId,
      progress,
    };
    self.postMessage(progressResponse);

    // Generate placeholder peaks
    const amplitude = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5;
    peaks.push({
      min: -amplitude,
      max: amplitude,
      rms: amplitude * 0.707,
    });

  }

  return peaks;
}

// ---------------------------------------------------------------------------
// Worker Client (for main thread)
// ---------------------------------------------------------------------------

export type WaveformWorkerClientConfig = {
  /** Worker script URL or module. */
  workerUrl: string | URL;
  /** Number of workers to create. Default: 1. */
  poolSize?: number;
};

export type WaveformJob = {
  id: string;
  request: WaveformRequest;
  onProgress?: (progress: number) => void;
  onComplete?: (result: WaveformResult) => void;
  onError?: (error: string) => void;
};

/**
 * Client for managing waveform worker pool from the main thread.
 */
export class WaveformWorkerClient {
  private config: WaveformWorkerClientConfig;
  private workers: Worker[] = [];
  private jobQueue: WaveformJob[] = [];
  private activeJobs: Map<string, WaveformJob> = new Map();
  private nextWorkerIndex: number = 0;

  constructor(config: WaveformWorkerClientConfig) {
    this.config = {
      workerUrl: config.workerUrl,
      poolSize: config.poolSize ?? 1,
    };

    // Create worker pool
    for (let i = 0; i < (this.config.poolSize ?? 1); i++) {
      const worker = new Worker(config.workerUrl, { type: 'module' });
      worker.onmessage = (event) => this.handleWorkerMessage(worker, event);
      this.workers.push(worker);
    }
  }

  /**
   * Submit a waveform extraction job.
   */
  submitJob(
    request: WaveformRequest,
    callbacks?: {
      onProgress?: (progress: number) => void;
      onComplete?: (result: WaveformResult) => void;
      onError?: (error: string) => void;
    },
  ): string {
    const job: WaveformJob = {
      id: request.requestId,
      request,
      onProgress: callbacks?.onProgress,
      onComplete: callbacks?.onComplete,
      onError: callbacks?.onError,
    };

    this.jobQueue.push(job);
    this.processQueue();

    return job.id;
  }

  /**
   * Cancel a job.
   */
  cancelJob(jobId: string): void {
    // Remove from queue if pending
    this.jobQueue = this.jobQueue.filter((job) => job.id !== jobId);

    // Cancel active job
    const job = this.activeJobs.get(jobId);
    if (job) {
      this.activeJobs.delete(jobId);
      // Send cancel message to all workers (they'll ignore unknown requestIds)
      const cancelMsg: WaveformWorkerMessage = {
        type: 'cancel',
        requestId: jobId,
      };
      for (const worker of this.workers) {
        worker.postMessage(cancelMsg);
      }
    }
  }

  /**
   * Process the job queue.
   */
  private processQueue(): void {
    while (this.jobQueue.length > 0 && this.activeJobs.size < this.workers.length) {
      const job = this.jobQueue.shift()!;
      const worker = this.workers[this.nextWorkerIndex];
      this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;

      this.activeJobs.set(job.id, job);

      const message: WaveformWorkerMessage = {
        type: 'request',
        payload: job.request,
      };

      worker.postMessage(message);
    }
  }

  /**
   * Handle messages from workers.
   */
  private handleWorkerMessage(
    worker: Worker,
    event: MessageEvent<WaveformWorkerResponse>,
  ): void {
    const { type } = event.data;

    switch (type) {
      case 'progress': {
        const job = this.activeJobs.get(event.data.requestId);
        if (job) {
          job.onProgress?.(event.data.progress);
        }
        break;
      }
      case 'result': {
        const job = this.activeJobs.get(event.data.payload.requestId);
        if (job) {
          this.activeJobs.delete(event.data.payload.requestId);
          job.onComplete?.(event.data.payload);
          this.processQueue();
        }
        break;
      }
      case 'error': {
        const job = this.activeJobs.get(event.data.requestId);
        if (job) {
          this.activeJobs.delete(event.data.requestId);
          job.onError?.(event.data.message);
          this.processQueue();
        }
        break;
      }
    }
  }

  /**
   * Terminate all workers.
   */
  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.jobQueue = [];
    this.activeJobs.clear();
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a waveform worker client.
 */
export function createWaveformWorkerClient(
  config: WaveformWorkerClientConfig,
): WaveformWorkerClient {
  return new WaveformWorkerClient(config);
}
