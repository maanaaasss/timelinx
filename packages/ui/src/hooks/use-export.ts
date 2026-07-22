/**
 * useExport hook — Phase 11
 *
 * Drives real-time export via canvas.captureStream() + MediaRecorder.
 * Handles audio routing via Web Audio API, progress tracking, and
 * cancel/cleanup.
 */
import { useState, useRef, useCallback } from 'react';
import type { TimelineEngine } from '@timelinx/react';
import type { Clip, FileAsset, TimelineState } from '@timelinx/core';
import { toFrame } from '@timelinx/core';
import type { MediaAssetsContextValue } from '../context/media-assets-context';
import { MediaElementPool, renderCompositorFrame } from '../components/canvas-compositor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExportStatus = 'idle' | 'preparing' | 'encoding' | 'complete' | 'error';

export interface ExportState {
  status: ExportStatus;
  progress: number;
  error: string | null;
  downloadUrl: string | null;
  fileName: string;
}

export interface UseExportReturn {
  state: ExportState;
  startExport: () => void;
  cancelExport: () => void;
  isSupported: boolean;
}

// ---------------------------------------------------------------------------
// Browser support check
// ---------------------------------------------------------------------------

function checkExportSupport(): boolean {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  return (
    typeof canvas.captureStream === 'function' &&
    typeof MediaRecorder !== 'undefined'
  );
}

function getSupportedMimeType(): string | null {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Audio helpers
// ---------------------------------------------------------------------------

interface AudioClipInfo {
  clip: Clip;
  asset: FileAsset;
  src: string;
}

function collectAudioClips(
  state: TimelineState,
  mediaAssets: MediaAssetsContextValue,
): AudioClipInfo[] {
  const result: AudioClipInfo[] = [];
  for (const track of state.timeline.tracks) {
    if (track.type !== 'audio' || track.muted) continue;
    for (const clip of track.clips) {
      const asset = state.assetRegistry.get(clip.assetId);
      if (!asset || asset.kind !== 'generator' && asset.mediaType !== 'audio') continue;
      if (asset.kind === 'generator') continue;
      const fileAsset = asset as FileAsset;
      const blobUrl = mediaAssets.getBlobUrl(asset.id as string);
      const src = blobUrl || fileAsset.filePath;
      if (src) {
        result.push({ clip, asset: fileAsset, src });
      }
    }
  }
  return result;
}

async function loadAudioBuffer(
  audioCtx: AudioContext,
  src: string,
): Promise<AudioBuffer | null> {
  try {
    const response = await fetch(src);
    const arrayBuffer = await response.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Audio scheduling — pure, testable math
// ---------------------------------------------------------------------------

export interface AudioScheduleEntry {
  /** Absolute AudioContext time at which playback should begin. */
  when: number;
  /** Offset into the source audio buffer (seconds) to start from. */
  offset: number;
  /** How many seconds of source audio to play. */
  duration: number;
  /** Linear gain multiplier (converted from dB). */
  gain: number;
}

/**
 * Given a list of audio clip infos, the AudioContext base time, and fps,
 * compute the scheduling arguments for each clip's AudioBufferSourceNode.start().
 *
 * This is a pure function — no DOM, no AudioContext, no side effects —
 * so it can be unit-tested directly.
 */
export function computeAudioSchedule(
  clips: Array<{ clip: Clip }>,
  audioCtxCurrentTime: number,
  fps: number,
): AudioScheduleEntry[] {
  return clips.map(({ clip }) => {
    const timelineStartSec = (clip.timelineStart as number) / fps;
    const mediaInSec = ((clip.mediaIn ?? 0) as number) / fps;
    const clipDurationSec =
      ((clip.timelineEnd as number) - (clip.timelineStart as number)) / fps;
    const gainDb = clip.audio?.gain?.value ?? 0;
    const gainLinear = Math.pow(10, gainDb / 20);

    return {
      when: audioCtxCurrentTime + timelineStartSec,
      offset: mediaInSec,
      duration: clipDurationSec,
      gain: gainLinear,
    };
  });
}

// ---------------------------------------------------------------------------
// Export engine
// ---------------------------------------------------------------------------

class ExportRunner {
  private engine: TimelineEngine;
  private mediaAssets: MediaAssetsContextValue;
  private canvas: HTMLCanvasElement | null = null;
  private pool: MediaElementPool = new MediaElementPool();
  private lastSeekRef: Map<string, number> = new Map();
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private audioCtx: AudioContext | null = null;
  private audioDest: MediaStreamAudioDestinationNode | null = null;
  private audioSources: AudioBufferSourceNode[] = [];
  private stream: MediaStream | null = null;
  private cancelled = false;
  private startTime = 0;
  private onProgress: (state: ExportState) => void;

  constructor(
    engine: TimelineEngine,
    mediaAssets: MediaAssetsContextValue,
    onProgress: (state: ExportState) => void,
  ) {
    this.engine = engine;
    this.mediaAssets = mediaAssets;
    this.onProgress = onProgress;
  }

  async run(): Promise<void> {
    const state = this.engine.getState();
    const fps = (state.timeline.fps as number) || 30;
    const durationFrames = (state.timeline.duration as number) || 1;
    const totalSeconds = durationFrames / fps;

    // 1. Create export canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1920;
    this.canvas.height = 1080;

    // 2. Set up canvas capture
    const videoStream = this.canvas.captureStream(fps);
    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      throw new Error('No supported video MIME type found for MediaRecorder');
    }

    // 3. Set up audio
    let combinedStream: MediaStream;
    try {
      this.audioCtx = new AudioContext();
      this.audioDest = this.audioCtx.createMediaStreamDestination();

      const audioClips = collectAudioClips(state, this.mediaAssets);
      const schedule = computeAudioSchedule(
        audioClips,
        this.audioCtx.currentTime,
        fps,
      );

      for (let i = 0; i < audioClips.length; i++) {
        const info = audioClips[i]!;
        const entry = schedule[i]!;
        const buffer = await loadAudioBuffer(this.audioCtx, info.src);
        if (!buffer) continue;

        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = entry.gain;

        source.connect(gainNode);
        gainNode.connect(this.audioDest!);

        source.start(entry.when, entry.offset, entry.duration);
        this.audioSources.push(source);
      }

      // Combine video + audio streams
      const audioTracks = this.audioDest.stream.getAudioTracks();
      combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioTracks,
      ]);
    } catch {
      // If audio setup fails, proceed with video only
      combinedStream = videoStream;
    }

    // 4. Create MediaRecorder
    this.mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 5_000_000,
    });

    this.recordedChunks = [];
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };

    const recorderDone = new Promise<void>((resolve, reject) => {
      this.mediaRecorder!.onstop = () => resolve();
      this.mediaRecorder!.onerror = (e) => reject(e);
    });

    // 5. Seek to start and begin recording
    this.engine.seekTo(toFrame(0));
    this.mediaRecorder.start(100);
    this.startTime = performance.now();
    this.cancelled = false;

    this.onProgress({
      status: 'encoding',
      progress: 0,
      error: null,
      downloadUrl: null,
      fileName: '',
    });

    // 6. Drive playback
    this.engine.playbackEngine?.play();

    // 7. Render loop — paint to export canvas on each frame
    await new Promise<void>((resolve) => {
      const checkDone = () => {
        if (this.cancelled) {
          this.engine.playbackEngine?.pause();
          resolve();
          return;
        }

        const currentFrame =
          this.engine.getSnapshot().playhead.currentFrame as number;
        const progress = Math.min(1, currentFrame / durationFrames);

        // Render to export canvas
        renderCompositorFrame(
          {
            canvas: this.canvas!,
            engine: this.engine,
            mediaAssets: this.mediaAssets,
            pool: this.pool,
            lastSeekRef: this.lastSeekRef,
          },
          currentFrame,
        );

        this.onProgress({
          status: 'encoding',
          progress,
          error: null,
          downloadUrl: null,
          fileName: '',
        });

        if (currentFrame >= durationFrames - 1) {
          this.engine.playbackEngine?.pause();
          resolve();
          return;
        }

        requestAnimationFrame(checkDone);
      };

      // Also listen for the 'ended' event from the playhead controller
      const unsubscribe = this.engine.playbackEngine?.on((event) => {
        if (event.type === 'ended') {
          this.engine.playbackEngine?.pause();
          unsubscribe?.();
          resolve();
        }
      });

      requestAnimationFrame(checkDone);
    });

    // 8. Stop recording
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    await recorderDone;

    // 9. Create blob
    const blob = new Blob(this.recordedChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const elapsed = ((performance.now() - this.startTime) / 1000).toFixed(1);
    const fileName = `timeline-export-${Date.now()}.webm`;

    this.onProgress({
      status: 'complete',
      progress: 1,
      error: null,
      downloadUrl: url,
      fileName,
    });

    // Auto-download
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
  }

  cancel(): void {
    this.cancelled = true;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.engine.playbackEngine?.pause();
    this.cleanup();
  }

  cleanup(): void {
    for (const source of this.audioSources) {
      try { source.stop(); } catch { /* already stopped */ }
    }
    this.audioSources = [];
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }
    this.audioCtx = null;
    this.audioDest = null;
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.pool.destroy();
    this.pool = new MediaElementPool();
    this.lastSeekRef.clear();
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useExport(
  engine: TimelineEngine,
  mediaAssets: MediaAssetsContextValue,
): UseExportReturn {
  const [state, setState] = useState<ExportState>({
    status: 'idle',
    progress: 0,
    error: null,
    downloadUrl: null,
    fileName: '',
  });
  const runnerRef = useRef<ExportRunner | null>(null);

  const startExport = useCallback(() => {
    if (runnerRef.current) return; // already running

    const runner = new ExportRunner(engine, mediaAssets, (update) => {
      setState((prev) => ({ ...prev, ...update }));
    });
    runnerRef.current = runner;

    setState({
      status: 'preparing',
      progress: 0,
      error: null,
      downloadUrl: null,
      fileName: '',
    });

    runner
      .run()
      .catch((err) => {
        setState({
          status: 'error',
          progress: 0,
          error: err instanceof Error ? err.message : 'Export failed',
          downloadUrl: null,
          fileName: '',
        });
      })
      .finally(() => {
        runner.cleanup();
        runnerRef.current = null;
      });
  }, [engine, mediaAssets]);

  const cancelExport = useCallback(() => {
    runnerRef.current?.cancel();
    runnerRef.current = null;
    setState({
      status: 'idle',
      progress: 0,
      error: null,
      downloadUrl: null,
      fileName: '',
    });
  }, []);

  return {
    state,
    startExport,
    cancelExport,
    isSupported: checkExportSupport(),
  };
}
