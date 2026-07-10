/**
 * Simple Export Adapter
 *
 * Provides basic video export using MediaRecorder API.
 * Supports WebM and MP4 (if supported) output formats.
 */

import type { TimelineFrame } from '@timelinx/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExportFormat = 'webm' | 'mp4';

export type ExportConfig = {
  /** Output format. Default: 'webm'. */
  format?: ExportFormat;
  /** Video bitrate. Default: 2500000 (2.5 Mbps). */
  videoBitrate?: number;
  /** Audio bitrate. Default: 128000 (128 kbps). */
  audioBitrate?: number;
  /** Frame rate for export. Default: 30. */
  frameRate?: number;
  /** Video width. Default: 1920. */
  width?: number;
  /** Video height. Default: 1080. */
  height?: number;
};

export type ExportProgress = {
  readonly phase: 'preparing' | 'encoding' | 'finalizing' | 'complete';
  readonly progress: number;
  readonly frame?: number;
  readonly totalFrames?: number;
  readonly elapsedMs?: number;
};

export type ExportResult = {
  readonly success: boolean;
  readonly blob?: Blob;
  readonly format: ExportFormat;
  readonly durationMs: number;
  readonly error?: string;
};

// ---------------------------------------------------------------------------
// SimpleExportAdapter
// ---------------------------------------------------------------------------

export class SimpleExportAdapter {
  private config: ExportConfig;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isExporting: boolean = false;
  private stream: MediaStream | null = null;

  constructor(config: ExportConfig = {}) {
    this.config = {
      format: config.format ?? 'webm',
      videoBitrate: config.videoBitrate ?? 2500000,
      audioBitrate: config.audioBitrate ?? 128000,
      frameRate: config.frameRate ?? 30,
      width: config.width ?? 1920,
      height: config.height ?? 1080,
    };
  }

  /**
   * Check if a format is supported for export.
   */
  static isFormatSupported(format: ExportFormat): boolean {
    if (typeof MediaRecorder === 'undefined') return false;

    const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm;codecs=vp9';
    return MediaRecorder.isTypeSupported(mimeType);
  }

  /**
   * Get the MIME type for the configured format.
   */
  private getMimeType(): string {
    if (this.config.format === 'mp4') {
      return 'video/mp4';
    }
    // Prefer VP9 for better quality, fall back to VP8
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      return 'video/webm;codecs=vp9';
    }
    return 'video/webm;codecs=vp8';
  }

  /**
   * Export frames from a canvas stream.
   *
   * @param frameProvider - Async function that yields canvas frames
   * @param totalFrames - Total number of frames to export
   * @param onProgress - Progress callback
   */
  async exportFromCanvasStream(
    frameProvider: (frame: number) => Promise<HTMLCanvasElement | OffscreenCanvas>,
    totalFrames: number,
    onProgress?: (progress: ExportProgress) => void,
  ): Promise<ExportResult> {
    if (this.isExporting) {
      return {
        success: false,
        format: this.config.format!,
        durationMs: 0,
        error: 'Export already in progress',
      };
    }

    const startTime = performance.now();
    this.isExporting = true;
    this.recordedChunks = [];

    try {
      // Get first frame to determine stream
      const firstFrame = await frameProvider(0);
      const stream = (firstFrame as HTMLCanvasElement).captureStream?.(this.config.frameRate);
      this.stream = stream;

      if (!stream) {
        throw new Error('captureStream is not available. Use HTMLCanvasElement.');
      }

      // Create MediaRecorder
      const mimeType = this.getMimeType();
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: this.config.videoBitrate,
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      // Start recording
      this.mediaRecorder.start(100); // Collect in 100ms chunks

      onProgress?.({
        phase: 'encoding',
        progress: 0,
        frame: 0,
        totalFrames,
      });

      // Render all frames
      for (let i = 0; i < totalFrames; i++) {
        const canvas = await frameProvider(i);

        // Draw frame to stream's canvas (if needed)
        // The frameProvider should already be drawing to a visible canvas

        // Report progress
        if (i % 10 === 0) {
          onProgress?.({
            phase: 'encoding',
            progress: i / totalFrames,
            frame: i,
            totalFrames,
          });
        }

        // Small delay to allow rendering
        await new Promise((resolve) => setTimeout(resolve, 1));
      }

      // Finalize
      onProgress?.({
        phase: 'finalizing',
        progress: 1,
        frame: totalFrames,
        totalFrames,
      });

      // Stop recording and wait for data
      await new Promise<void>((resolve, reject) => {
        if (!this.mediaRecorder) {
          reject(new Error('MediaRecorder not initialized'));
          return;
        }

        this.mediaRecorder.onstop = () => resolve();
        this.mediaRecorder.onerror = (e) => reject(e);
        this.mediaRecorder.stop();
      });

      // Create blob from recorded chunks
      const blob = new Blob(this.recordedChunks, { type: mimeType });
      const durationMs = performance.now() - startTime;

      onProgress?.({
        phase: 'complete',
        progress: 1,
        frame: totalFrames,
        totalFrames,
        elapsedMs: durationMs,
      });

      return {
        success: true,
        blob,
        format: this.config.format!,
        durationMs,
      };
    } catch (error) {
      return {
        success: false,
        format: this.config.format!,
        durationMs: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    } finally {
      this.isExporting = false;
      this.mediaRecorder = null;
      this.recordedChunks = [];
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
    }
  }

  /**
   * Export a single frame as an image.
   */
  async exportFrameAsImage(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    format: 'png' | 'jpeg' | 'webp' = 'png',
    quality: number = 0.92,
  ): Promise<Blob | null> {
    return new Promise((resolve, reject) => {
      if (typeof HTMLCanvasElement !== 'undefined' && canvas instanceof HTMLCanvasElement) {
        canvas.toBlob(
          (blob) => resolve(blob),
          `image/${format}`,
          quality,
        );
      } else if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
        canvas.convertToBlob({
          type: `image/${format}`,
          quality,
        }).then(resolve).catch(reject);
      } else {
        resolve(null);
      }
    });
  }

  /**
   * Cancel an in-progress export.
   */
  cancelExport(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.isExporting = false;
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  /**
   * Check if an export is currently in progress.
   */
  isCurrentlyExporting(): boolean {
    return this.isExporting;
  }

  /**
   * Release resources.
   */
  destroy(): void {
    this.cancelExport();
    this.recordedChunks = [];
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a simple export adapter with default configuration.
 */
export function createSimpleExporter(
  config?: ExportConfig,
): SimpleExportAdapter {
  return new SimpleExportAdapter(config);
}
