/**
 * WebAudio Waveform Adapter
 *
 * Extracts waveform data from audio using the Web Audio API.
 * Implements a waveform generator for timeline visualization.
 */

import type { AssetId, TimelineFrame } from '@timelinx/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WaveformConfig = {
  /** Sample rate for extraction. Default: 44100. */
  sampleRate?: number;
  /** Number of channels to extract. Default: 1 (mono). */
  channels?: number;
  /** Number of peaks/buckets per second. Default: 20. */
  peaksPerSecond?: number;
};

export type WaveformPeak = {
  readonly min: number;
  readonly max: number;
  readonly rms: number;
};

export type WaveformData = {
  readonly assetId: AssetId;
  readonly duration: number;
  readonly sampleRate: number;
  readonly channels: number;
  readonly peaks: ReadonlyArray<ReadonlyArray<WaveformPeak>>;
};

export type WaveformExtractionResult = {
  readonly assetId: AssetId;
  readonly success: boolean;
  readonly waveformData?: WaveformData;
  readonly error?: string;
};

// ---------------------------------------------------------------------------
// WebAudioWaveformAdapter
// ---------------------------------------------------------------------------

export class WebAudioWaveformAdapter {
  private config: WaveformConfig;
  private audioContext: AudioContext | null = null;
  private waveformData: Map<string, WaveformData> = new Map();

  constructor(config: WaveformConfig = {}) {
    this.config = {
      sampleRate: config.sampleRate ?? 44100,
      channels: config.channels ?? 1,
      peaksPerSecond: config.peaksPerSecond ?? 20,
    };
  }

  /**
   * Get or create an AudioContext.
   */
  private async getAudioContext(): Promise<AudioContext> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
      });
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  /**
   * Extract waveform data from an AudioBuffer.
   */
  async extractFromBuffer(
    assetId: AssetId,
    audioBuffer: AudioBuffer,
  ): Promise<WaveformExtractionResult> {
    try {
      const { channels: rawChannels, peaksPerSecond: rawPeaksPerSecond } = this.config;
      const channels = rawChannels ?? 1;
      const peaksPerSecond = rawPeaksPerSecond ?? 20;
      const duration = audioBuffer.duration;
      const totalPeaks = Math.ceil(duration * peaksPerSecond);
      const channelData: Array<WaveformPeak[]> = [];

      // Extract peaks for each channel
      for (let ch = 0; ch < Math.min(channels, audioBuffer.numberOfChannels); ch++) {
        const rawData = audioBuffer.getChannelData(ch);
        const peaks = this.extractPeaks(rawData, totalPeaks, audioBuffer.sampleRate);
        channelData.push(peaks);
      }

      const waveformData: WaveformData = {
        assetId,
        duration,
        sampleRate: audioBuffer.sampleRate,
        channels: channelData.length,
        peaks: channelData,
      };

      this.waveformData.set(assetId as string, waveformData);

      return {
        assetId,
        success: true,
        waveformData,
      };
    } catch (error) {
      return {
        assetId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract waveform data from a File or Blob.
   */
  async extractFromFile(
    assetId: AssetId,
    file: File | Blob,
  ): Promise<WaveformExtractionResult> {
    try {
      const audioContext = await this.getAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return this.extractFromBuffer(assetId, audioBuffer);
    } catch (error) {
      return {
        assetId,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to decode audio',
      };
    }
  }

  /**
   * Extract waveform data from a URL.
   */
  async extractFromUrl(
    assetId: AssetId,
    url: string,
  ): Promise<WaveformExtractionResult> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }
      const blob = await response.blob();
      return this.extractFromFile(assetId, blob);
    } catch (error) {
      return {
        assetId,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch audio',
      };
    }
  }

  /**
   * Extract peaks from raw PCM data.
   */
  private extractPeaks(
    rawData: Float32Array,
    totalPeaks: number,
    sampleRate: number,
  ): WaveformPeak[] {
    const peaks: WaveformPeak[] = [];
    const samplesPerPeak = Math.floor(rawData.length / totalPeaks);

    for (let i = 0; i < totalPeaks; i++) {
      const start = i * samplesPerPeak;
      const end = Math.min(start + samplesPerPeak, rawData.length);

      let min = Infinity;
      let max = -Infinity;
      let sumSquares = 0;

      for (let j = start; j < end; j++) {
        const sample = rawData[j];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
        sumSquares += sample * sample;
      }

      const rms = Math.sqrt(sumSquares / (end - start));

      peaks.push({ min, max, rms });
    }

    return peaks;
  }

  /**
   * Get waveform data for a specific asset.
   */
  getWaveformData(assetId: AssetId): WaveformData | undefined {
    return this.waveformData.get(assetId as string);
  }

  /**
   * Get peaks for a specific time range.
   */
  getPeaksForRange(
    assetId: AssetId,
    startTime: number,
    endTime: number,
    bucketCount: number,
  ): WaveformPeak[] | undefined {
    const data = this.waveformData.get(assetId as string);
    if (!data || data.peaks.length === 0) return undefined;

    const { duration, peaks } = data;
    const channelPeaks = peaks[0] ?? [];
    if (channelPeaks.length === 0) return undefined;

    const startRatio = Math.max(0, startTime / duration);
    const endRatio = Math.min(1, endTime / duration);

    const startIdx = Math.floor(startRatio * channelPeaks.length);
    const endIdx = Math.ceil(endRatio * channelPeaks.length);
    const totalInRange = endIdx - startIdx;

    const bucketSize = Math.max(1, Math.floor(totalInRange / bucketCount));
    const result: WaveformPeak[] = [];

    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = startIdx + i * bucketSize;
      const bucketEnd = Math.min(bucketStart + bucketSize, channelPeaks.length);

      let min = Infinity;
      let max = -Infinity;
      let sumSquares = 0;
      let count = 0;

      for (let j = bucketStart; j < bucketEnd; j++) {
        const peak = channelPeaks[j];
        if (peak) {
          if (peak.min < min) min = peak.min;
          if (peak.max > max) max = peak.max;
          sumSquares += peak.rms * peak.rms;
          count++;
        }
      }

      const rms = count > 0 ? Math.sqrt(sumSquares / count) : 0;
      result.push({ min, max, rms });
    }

    return result;
  }

  /**
   * Clear cached waveform data.
   */
  clearCache(): void {
    this.waveformData.clear();
  }

  /**
   * Close the audio context and release resources.
   */
  async destroy(): Promise<void> {
    this.clearCache();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a WebAudio waveform adapter with default configuration.
 */
export function createWebAudioWaveform(
  config?: WaveformConfig,
): WebAudioWaveformAdapter {
  return new WebAudioWaveformAdapter(config);
}
