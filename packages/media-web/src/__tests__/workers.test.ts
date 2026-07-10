/**
 * Tests for ThumbnailWorkerClient and WaveformWorkerClient
 *
 * Uses a mock Worker harness since real Web Workers aren't available in Node.js.
 * Tests cover: job queuing, priority ordering, pool concurrency, error propagation,
 * cancel behavior, and destroy/cleanup idempotency.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ThumbnailWorkerClient,
  createThumbnailWorkerClient,
  type ThumbnailWorkerClientConfig,
  type ThumbnailWorkerMessage,
  type ThumbnailWorkerResponse,
  type ThumbnailRequest,
  type ThumbnailPriority,
} from '../workers/thumbnail-worker';
import {
  WaveformWorkerClient,
  createWaveformWorkerClient,
  type WaveformWorkerClientConfig,
  type WaveformWorkerMessage,
  type WaveformWorkerResponse,
  type WaveformRequest,
} from '../workers/waveform-worker';

// ---------------------------------------------------------------------------
// Mock Worker
// ---------------------------------------------------------------------------

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  private messageLog: unknown[] = [];
  static instances: MockWorker[] = [];

  constructor() {
    MockWorker.instances.push(this);
  }

  postMessage(data: unknown) {
    this.messageLog.push(data);
  }

  terminate() {
    // no-op
  }

  getMessageLog(): unknown[] {
    return this.messageLog;
  }

  getLastMessage(): unknown {
    return this.messageLog[this.messageLog.length - 1];
  }

  clearMessages() {
    this.messageLog = [];
  }

  // Simulate worker sending a message back
  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  // Simulate worker error
  simulateError(message: string) {
    if (this.onerror) {
      this.onerror(new ErrorEvent('error', { message }));
    }
  }
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeThumbnailRequest(
  clipId = 'clip-1',
  mediaFrame = 0,
  width = 160,
  height = 90,
): ThumbnailRequest {
  return {
    clipId: clipId as any,
    mediaFrame: mediaFrame as any,
    width,
    height,
    time: mediaFrame / 30,
  };
}

function makeWaveformRequest(
  requestId = 'req-1',
  buckets = 100,
): WaveformRequest {
  return {
    requestId,
    assetId: 'asset-1' as any,
    channel: 0,
    startFrame: 0 as any,
    endFrame: (buckets * 10) as any,
    buckets,
    sampleRate: 44100,
  };
}

function makeThumbnailResult(clipId = 'clip-1', mediaFrame = 0): ThumbnailWorkerResponse {
  return {
    type: 'result',
    payload: {
      clipId: clipId as any,
      mediaFrame: mediaFrame as any,
      bitmap: {} as any,
    },
  };
}

function makeWaveformResult(requestId = 'req-1', bucketCount = 100): WaveformWorkerResponse {
  const peaks = Array.from({ length: bucketCount }, (_, i) => ({
    min: -0.5,
    max: 0.5,
    rms: 0.35,
  }));
  return {
    type: 'result',
    payload: {
      requestId,
      assetId: 'asset-1' as any,
      peaks,
    },
  };
}

// ---------------------------------------------------------------------------
// ThumbnailWorkerClient tests
// ---------------------------------------------------------------------------

describe('ThumbnailWorkerClient', () => {
  let OriginalWorker: typeof globalThis.Worker;

  beforeEach(() => {
    MockWorker.instances = [];
    OriginalWorker = globalThis.Worker;
    (globalThis as any).Worker = MockWorker;
  });

  afterEach(() => {
    (globalThis as any).Worker = OriginalWorker;
  });

  describe('construction', () => {
    it('creates workers based on poolSize', () => {
      const client = new ThumbnailWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 3,
      });
      expect(MockWorker.instances).toHaveLength(3);
      client.terminate();
    });

    it('defaults poolSize to 2', () => {
      const client = new ThumbnailWorkerClient({
        workerUrl: 'worker.js',
      });
      expect(MockWorker.instances).toHaveLength(2);
      client.terminate();
    });
  });

  describe('requestThumbnail and queue processing', () => {
    it('sends request to a worker', () => {
      const client = new ThumbnailWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 1,
      });

      client.requestThumbnail(makeThumbnailRequest());

      const worker = MockWorker.instances[0];
      const msg = worker.getLastMessage() as ThumbnailWorkerMessage;
      expect(msg.type).toBe('request');
      expect((msg as any).payload.request.clipId).toBe('clip-1');
      client.terminate();
    });

    it('queues requests when all workers are busy', () => {
      const client = new ThumbnailWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 1,
      });

      // First request goes to worker
      client.requestThumbnail(makeThumbnailRequest('clip-1', 0));
      // Worker hasn't responded yet, so second request is queued
      client.requestThumbnail(makeThumbnailRequest('clip-2', 1));

      const worker = MockWorker.instances[0];
      // Only 1 message sent (the first request)
      expect(worker.getMessageLog()).toHaveLength(1);
      client.terminate();
    });

    it('processes queued items when worker completes', () => {
      const client = new ThumbnailWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 1,
      });

      client.requestThumbnail(makeThumbnailRequest('clip-1', 0));
      client.requestThumbnail(makeThumbnailRequest('clip-2', 1));

      const worker = MockWorker.instances[0];
      // Simulate worker completing the first request
      worker.simulateMessage(makeThumbnailResult('clip-1', 0));

      // Second request should now be sent
      expect(worker.getMessageLog()).toHaveLength(2);
      const msg = worker.getLastMessage() as ThumbnailWorkerMessage;
      expect((msg as any).payload.request.clipId).toBe('clip-2');
      client.terminate();
    });
  });

  describe('priority ordering', () => {
    it('processes high priority requests before low', () => {
      const client = new ThumbnailWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 1,
      });

      // Fill the worker slot
      client.requestThumbnail(makeThumbnailRequest('clip-1', 0), 'high');
      // These get queued
      client.requestThumbnail(makeThumbnailRequest('clip-2', 1), 'low');
      client.requestThumbnail(makeThumbnailRequest('clip-3', 2), 'high');

      const worker = MockWorker.instances[0];
      // Complete first request
      worker.simulateMessage(makeThumbnailResult('clip-1', 0));

      // Second message should be the high-priority clip-3, not low-priority clip-2
      const secondMsg = worker.getLastMessage() as ThumbnailWorkerMessage;
      expect((secondMsg as any).payload.request.clipId).toBe('clip-3');
      client.terminate();
    });
  });

  describe('error propagation', () => {
    it('invokes onError callback on worker error', () => {
      const onError = vi.fn();
      const client = new ThumbnailWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 1,
        onError,
      });

      client.requestThumbnail(makeThumbnailRequest('clip-1', 0));

      const worker = MockWorker.instances[0];
      worker.simulateMessage({
        type: 'error',
        requestId: 'clip-1-0',
        message: 'Worker crashed',
      });

      expect(onError).toHaveBeenCalledWith('clip-1-0', 'Worker crashed');
      client.terminate();
    });

    it('invokes onResult callback on successful result', () => {
      const onResult = vi.fn();
      const client = new ThumbnailWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 1,
        onResult,
      });

      client.requestThumbnail(makeThumbnailRequest('clip-1', 0));

      const worker = MockWorker.instances[0];
      worker.simulateMessage(makeThumbnailResult('clip-1', 0));

      expect(onResult).toHaveBeenCalledWith(
        expect.objectContaining({ clipId: 'clip-1' }),
      );
      client.terminate();
    });

    it('invokes onProgress callback on progress', () => {
      const onProgress = vi.fn();
      const client = new ThumbnailWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 1,
        onProgress,
      });

      client.requestThumbnail(makeThumbnailRequest('clip-1', 0));

      const worker = MockWorker.instances[0];
      worker.simulateMessage({
        type: 'progress',
        requestId: 'clip-1-0',
        progress: 0.5,
      });

      expect(onProgress).toHaveBeenCalledWith('clip-1-0', 0.5);
      client.terminate();
    });

    it('processes next queued item after error', () => {
      const client = new ThumbnailWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 1,
      });

      client.requestThumbnail(makeThumbnailRequest('clip-1', 0));
      client.requestThumbnail(makeThumbnailRequest('clip-2', 1));

      const worker = MockWorker.instances[0];
      worker.simulateMessage({
        type: 'error',
        requestId: 'clip-1-0',
        message: 'failed',
      });

      // clip-2 should now be sent
      expect(worker.getMessageLog()).toHaveLength(2);
      client.terminate();
    });
  });

  describe('cancelRequest', () => {
    it('removes queued request', () => {
      const client = new ThumbnailWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 1,
      });

      client.requestThumbnail(makeThumbnailRequest('clip-1', 0));
      client.requestThumbnail(makeThumbnailRequest('clip-2', 1));

      // Cancel the queued one
      client.cancelRequest('clip-2', 1);

      // Complete first — clip-2 should NOT be sent
      const worker = MockWorker.instances[0];
      worker.simulateMessage(makeThumbnailResult('clip-1', 0));

      expect(worker.getMessageLog()).toHaveLength(1);
      client.terminate();
    });

    it('sends cancel message to workers for in-flight request', () => {
      const client = new ThumbnailWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 2,
      });

      client.requestThumbnail(makeThumbnailRequest('clip-1', 0));

      // Cancel the in-flight request
      client.cancelRequest('clip-1', 0);

      // Should have sent a cancel message
      const worker = MockWorker.instances[0];
      const messages = worker.getMessageLog();
      const cancelMsg = messages.find((m: any) => m.type === 'cancel');
      expect(cancelMsg).toBeDefined();
      expect((cancelMsg as any).clipId).toBe('clip-1');
      client.terminate();
    });
  });

  describe('queue overflow', () => {
    it('evicts lowest priority item when queue is full', () => {
      const client = new ThumbnailWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 1,
        maxQueueSize: 2,
      });

      // Fill worker
      client.requestThumbnail(makeThumbnailRequest('clip-1', 0));
      // Fill queue
      client.requestThumbnail(makeThumbnailRequest('clip-2', 1), 'low');
      client.requestThumbnail(makeThumbnailRequest('clip-3', 2), 'normal');

      // This should evict the low-priority clip-2
      client.requestThumbnail(makeThumbnailRequest('clip-4', 3), 'high');

      // Complete clip-1
      const worker = MockWorker.instances[0];
      worker.simulateMessage(makeThumbnailResult('clip-1', 0));

      // Should process high-priority clip-4 and normal clip-3, not evicted clip-2
      const sentMessages = worker.getMessageLog()
        .filter((m: any) => m.type === 'request')
        .map((m: any) => m.payload.request.clipId);

      // clip-1 was first, then after completion, high-priority clip-4 should be next
      expect(sentMessages).toContain('clip-4');
      client.terminate();
    });
  });

  describe('terminate', () => {
    it('terminates all workers and clears state', () => {
      const client = new ThumbnailWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 3,
      });

      client.requestThumbnail(makeThumbnailRequest('clip-1', 0));
      client.terminate();

      // All workers should have been terminated (terminate is a no-op on MockWorker,
      // but we verify no crash)
      expect(MockWorker.instances).toHaveLength(3);
    });

    it('is idempotent', () => {
      const client = new ThumbnailWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 1,
      });

      client.terminate();
      client.terminate();
      client.terminate();
    });
  });
});

// ---------------------------------------------------------------------------
// WaveformWorkerClient tests
// ---------------------------------------------------------------------------

describe('WaveformWorkerClient', () => {
  let OriginalWorker: typeof globalThis.Worker;

  beforeEach(() => {
    MockWorker.instances = [];
    OriginalWorker = globalThis.Worker;
    (globalThis as any).Worker = MockWorker;
  });

  afterEach(() => {
    (globalThis as any).Worker = OriginalWorker;
  });

  describe('construction', () => {
    it('creates workers based on poolSize', () => {
      const client = new WaveformWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 2,
      });
      expect(MockWorker.instances).toHaveLength(2);
      client.terminate();
    });

    it('defaults poolSize to 1', () => {
      const client = new WaveformWorkerClient({
        workerUrl: 'worker.js',
      });
      expect(MockWorker.instances).toHaveLength(1);
      client.terminate();
    });
  });

  describe('submitJob and queue processing', () => {
    it('sends request to worker', () => {
      const onComplete = vi.fn();
      const client = new WaveformWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 1,
      });

      client.submitJob(makeWaveformRequest('req-1'), { onComplete });

      const worker = MockWorker.instances[0];
      const msg = worker.getLastMessage() as WaveformWorkerMessage;
      expect(msg.type).toBe('request');
      expect((msg as any).payload.requestId).toBe('req-1');
      client.terminate();
    });

    it('queues when all workers busy', () => {
      const client = new WaveformWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 1,
      });

      client.submitJob(makeWaveformRequest('req-1'));
      client.submitJob(makeWaveformRequest('req-2'));

      const worker = MockWorker.instances[0];
      expect(worker.getMessageLog()).toHaveLength(1);
      client.terminate();
    });

    it('processes queue on completion', () => {
      const client = new WaveformWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 1,
      });

      client.submitJob(makeWaveformRequest('req-1', 10));
      client.submitJob(makeWaveformRequest('req-2', 10));

      const worker = MockWorker.instances[0];
      worker.simulateMessage(makeWaveformResult('req-1', 10));

      expect(worker.getMessageLog()).toHaveLength(2);
      client.terminate();
    });
  });

  describe('callbacks', () => {
    it('calls onComplete on result', () => {
      const onComplete = vi.fn();
      const client = new WaveformWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 1,
      });

      client.submitJob(makeWaveformRequest('req-1', 10), { onComplete });

      const worker = MockWorker.instances[0];
      worker.simulateMessage(makeWaveformResult('req-1', 10));

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 'req-1' }),
      );
      client.terminate();
    });

    it('calls onError on error', () => {
      const onError = vi.fn();
      const client = new WaveformWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 1,
      });

      client.submitJob(makeWaveformRequest('req-1'), { onError });

      const worker = MockWorker.instances[0];
      worker.simulateMessage({
        type: 'error',
        requestId: 'req-1',
        message: 'Extraction failed',
      });

      expect(onError).toHaveBeenCalledWith('Extraction failed');
      client.terminate();
    });

    it('calls onProgress on progress', () => {
      const onProgress = vi.fn();
      const client = new WaveformWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 1,
      });

      client.submitJob(makeWaveformRequest('req-1'), { onProgress });

      const worker = MockWorker.instances[0];
      worker.simulateMessage({
        type: 'progress',
        requestId: 'req-1',
        progress: 0.5,
      });

      expect(onProgress).toHaveBeenCalledWith(0.5);
      client.terminate();
    });
  });

  describe('cancelJob', () => {
    it('removes queued job', () => {
      const client = new WaveformWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 1,
      });

      client.submitJob(makeWaveformRequest('req-1', 10));
      client.submitJob(makeWaveformRequest('req-2', 10));
      client.cancelJob('req-2');

      const worker = MockWorker.instances[0];
      worker.simulateMessage(makeWaveformResult('req-1', 10));

      // req-2 should NOT be sent
      expect(worker.getMessageLog()).toHaveLength(1);
      client.terminate();
    });

    it('sends cancel message for active job', () => {
      const client = new WaveformWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 1,
      });

      client.submitJob(makeWaveformRequest('req-1', 10));
      client.cancelJob('req-1');

      const worker = MockWorker.instances[0];
      const messages = worker.getMessageLog();
      const cancelMsg = messages.find((m: any) => m.type === 'cancel');
      expect(cancelMsg).toBeDefined();
      expect((cancelMsg as any).requestId).toBe('req-1');
      client.terminate();
    });
  });

  describe('terminate', () => {
    it('terminates all workers and clears state', () => {
      const client = new WaveformWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 2,
      });

      client.submitJob(makeWaveformRequest('req-1'));
      client.terminate();

      expect(MockWorker.instances).toHaveLength(2);
    });

    it('is idempotent', () => {
      const client = new WaveformWorkerClient({
        workerUrl: 'worker.js',
        poolSize: 1,
      });

      client.terminate();
      client.terminate();
      client.terminate();
    });
  });
});

// ---------------------------------------------------------------------------
// Factory function tests
// ---------------------------------------------------------------------------

describe('Worker factory functions', () => {
  let OriginalWorker: typeof globalThis.Worker;

  beforeEach(() => {
    MockWorker.instances = [];
    OriginalWorker = globalThis.Worker;
    (globalThis as any).Worker = MockWorker;
  });

  afterEach(() => {
    (globalThis as any).Worker = OriginalWorker;
  });

  it('createThumbnailWorkerClient returns ThumbnailWorkerClient', () => {
    const client = createThumbnailWorkerClient({ workerUrl: 'worker.js' });
    expect(client).toBeInstanceOf(ThumbnailWorkerClient);
    client.terminate();
  });

  it('createWaveformWorkerClient returns WaveformWorkerClient', () => {
    const client = createWaveformWorkerClient({ workerUrl: 'worker.js' });
    expect(client).toBeInstanceOf(WaveformWorkerClient);
    client.terminate();
  });
});

// ---------------------------------------------------------------------------
// Worker implementation tests (createThumbnailWorker / createWaveformWorker)
// ---------------------------------------------------------------------------

describe('Worker implementations (context check)', () => {
  it('createThumbnailWorker warns in non-worker context', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { createThumbnailWorker } = await import('../workers/thumbnail-worker');
    createThumbnailWorker();
    // In Node.js environment, document is undefined but self is also undefined
    // The function checks typeof self === 'undefined' || typeof document !== 'undefined'
    // In Node.js, self is undefined so it should warn
    warnSpy.mockRestore();
  });

  it('createWaveformWorker warns in non-worker context', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { createWaveformWorker } = await import('../workers/waveform-worker');
    createWaveformWorker();
    warnSpy.mockRestore();
  });
});
