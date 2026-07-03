/**
 * @timelinx/media-web workers
 *
 * Off-main-thread workers for media processing.
 */

export {
  createWaveformWorker,
  WaveformWorkerClient,
  createWaveformWorkerClient,
} from './waveform-worker';

export type {
  WaveformWorkerClientConfig,
  WaveformJob,
} from './waveform-worker';

export {
  createThumbnailWorker,
  ThumbnailWorkerClient,
  createThumbnailWorkerClient,
} from './thumbnail-worker';

export type {
  ThumbnailWorkerClientConfig,
} from './thumbnail-worker';
