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

function getSupportedMimeType(hasAudio: boolean): string | null {
  const types = hasAudio
    ? [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ]
    : [
        'video/webm;codecs=vp9',
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

export interface ExportFrameAdvanceInput {
  currentFrame: number;
  frameAccum: number;
  elapsedMs: number;
  fps: number;
  durationFrames: number;
  maxFrameStep?: number;
}

export interface ExportFrameAdvanceResult {
  currentFrame: number;
  frameAccum: number;
}

export function advanceExportFrameClock({
  currentFrame,
  frameAccum,
  elapsedMs,
  fps,
  durationFrames,
  maxFrameStep = 3,
}: ExportFrameAdvanceInput): ExportFrameAdvanceResult {
  const safeFps = Number.isFinite(fps) && fps > 0 ? fps : 30;
  const safeDurationFrames = Math.max(1, Math.floor(durationFrames));
  const maxFrame = safeDurationFrames - 1;
  const safeCurrentFrame = Math.max(0, Math.min(currentFrame, maxFrame));
  const safeFrameAccum = Math.max(0, frameAccum);
  const safeElapsedMs = Math.max(0, elapsedMs);
  const nextFrameAccum = safeFrameAccum + (safeElapsedMs * safeFps) / 1000;
  const wholeFrames = Math.floor(nextFrameAccum);

  if (wholeFrames <= 0) {
    return {
      currentFrame: safeCurrentFrame,
      frameAccum: nextFrameAccum,
    };
  }

  const safeMaxFrameStep = Math.max(1, Math.floor(maxFrameStep));
  const advanceBy = Math.min(wholeFrames, safeMaxFrameStep);
  return {
    currentFrame: Math.min(safeCurrentFrame + advanceBy, maxFrame),
    frameAccum: nextFrameAccum - advanceBy,
  };
}

export function getExportDurationFrames(state: TimelineState): number {
  let contentEnd = 0;
  for (const track of state.timeline.tracks) {
    for (const clip of track.clips) {
      contentEnd = Math.max(contentEnd, clip.timelineEnd as number);
    }
    for (const caption of track.captions) {
      contentEnd = Math.max(contentEnd, caption.endFrame as number);
    }
  }

  if (contentEnd > 0) return contentEnd;
  return (state.timeline.duration as number) || 1;
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
  private pendingAudioStarts: Array<{
    buffer: AudioBuffer;
    entry: AudioScheduleEntry;
  }> = [];

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
    const timelineDurationFrames = (state.timeline.duration as number) || 1;
    const durationFrames = getExportDurationFrames(state);

    console.log('[EXPORT-DEBUG] === Export pipeline starting ===');
    console.log('[EXPORT-DEBUG] timeline.duration (frames):', timelineDurationFrames);
    console.log('[EXPORT-DEBUG] export duration from content (frames):', durationFrames);
    console.log('[EXPORT-DEBUG] timeline.fps:', fps);
    console.log('[EXPORT-DEBUG] computed duration (seconds):', durationFrames / fps);
    console.log('[EXPORT-DEBUG] track count:', state.timeline.tracks.length);
    for (const track of state.timeline.tracks) {
      console.log('[EXPORT-DEBUG]   track:', track.id, 'type:', track.type, 'clips:', track.clips.length, 'muted:', track.muted);
    }

    // 1. Create export canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1920;
    this.canvas.height = 1080;
    console.log('[EXPORT-DEBUG] Export canvas created:', this.canvas.width, 'x', this.canvas.height);

    // 2. Set up canvas capture
    let videoStream = this.canvas.captureStream(0);
    let canvasVideoTrack = videoStream.getVideoTracks()[0] as
      | (MediaStreamTrack & { requestFrame?: () => void })
      | undefined;
    if (!canvasVideoTrack?.requestFrame) {
      videoStream.getTracks().forEach((track) => track.stop());
      videoStream = this.canvas.captureStream(fps);
      canvasVideoTrack = videoStream.getVideoTracks()[0] as
        | (MediaStreamTrack & { requestFrame?: () => void })
        | undefined;
    }
    console.log('[EXPORT-DEBUG] captureStream() returned. Video tracks:', videoStream.getVideoTracks().length);
    console.log('[EXPORT-DEBUG] Canvas video track requestFrame supported:', Boolean(canvasVideoTrack?.requestFrame));

    // 3. Set up audio
    let combinedStream: MediaStream = videoStream;
    let hasAudio = false;
    const audioClips = collectAudioClips(state, this.mediaAssets);
    console.log('[EXPORT-DEBUG] Audio clips found for export:', audioClips.length);
    try {
      if (audioClips.length > 0) {
        this.audioCtx = new AudioContext();
        this.audioDest = this.audioCtx.createMediaStreamDestination();

        await this.audioCtx.resume?.();
        console.log('[EXPORT-DEBUG] AudioContext created, state:', this.audioCtx.state, 'currentTime:', this.audioCtx.currentTime);

        const loadedAudio: Array<{ info: AudioClipInfo; buffer: AudioBuffer }> = [];
        for (let i = 0; i < audioClips.length; i++) {
          const info = audioClips[i]!;
          const buffer = await loadAudioBuffer(this.audioCtx, info.src);
          if (buffer) {
            loadedAudio.push({ info, buffer });
            console.log('[EXPORT-DEBUG]   Loaded audio clip:', info.clip.id, 'duration:', buffer.duration, 'channels:', buffer.numberOfChannels);
          } else {
            console.warn('[EXPORT-DEBUG]   FAILED to load audio clip:', info.clip.id, 'src:', info.src);
          }
        }

        const schedule = computeAudioSchedule(
          loadedAudio.map(({ info }) => info),
          0,
          fps,
        );

        for (let i = 0; i < loadedAudio.length; i++) {
          const { buffer } = loadedAudio[i]!;
          const entry = schedule[i]!;
          const offset = Math.min(entry.offset, Math.max(0, buffer.duration));
          const duration = Math.min(entry.duration, Math.max(0, buffer.duration - offset));
          if (duration <= 0) continue;

          this.pendingAudioStarts.push({
            buffer,
            entry: {
              ...entry,
              offset,
              duration,
            },
          });
        }

        if (this.pendingAudioStarts.length > 0) {
          hasAudio = true;
          console.log('[EXPORT-DEBUG] Audio scheduling complete. Audio tracks:', this.audioDest.stream.getAudioTracks().length);

          // Combine video + audio streams
          const audioTracks = this.audioDest.stream.getAudioTracks();
          combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioTracks,
          ]);
        } else {
          console.log('[EXPORT-DEBUG] No playable audio loaded — recording video-only stream');
        }
      } else {
        console.log('[EXPORT-DEBUG] No audio clips — recording video-only stream');
      }
    } catch (err) {
      console.warn('[EXPORT-DEBUG] *** Audio setup FAILED — proceeding with video only ***', err);
      // If audio setup fails, proceed with video only
      combinedStream = videoStream;
      hasAudio = false;
    }
    this.stream = combinedStream;
    const mimeType = getSupportedMimeType(hasAudio);
    if (!mimeType) {
      throw new Error('No supported video MIME type found for MediaRecorder');
    }
    console.log('[EXPORT-DEBUG] Selected MIME type:', mimeType);

    // 4. Create MediaRecorder
    this.mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 5_000_000,
    });
    console.log('[EXPORT-DEBUG] MediaRecorder created. Initial state:', this.mediaRecorder.state);
    console.log('[EXPORT-DEBUG] Combined stream tracks — video:', combinedStream.getVideoTracks().length, 'audio:', combinedStream.getAudioTracks().length);

    this.recordedChunks = [];
    this.mediaRecorder.ondataavailable = (e) => {
      console.log('[EXPORT-DEBUG] ondataavailable — chunk size:', e.data.size, 'bytes, type:', e.data.type);
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };

    this.mediaRecorder.onstart = () => {
      console.log('[EXPORT-DEBUG] MediaRecorder onstart fired. State:', this.mediaRecorder?.state);
    };

    const recorderDone = new Promise<void>((resolve, reject) => {
      this.mediaRecorder!.onstop = () => resolve();
      this.mediaRecorder!.onerror = (e) => reject(e);
    });

    // 5. Seek to start, prime the canvas, and begin recording
    this.engine.seekTo(toFrame(0));
    renderCompositorFrame(
      {
        canvas: this.canvas,
        engine: this.engine,
        mediaAssets: this.mediaAssets,
        pool: this.pool,
        lastSeekRef: this.lastSeekRef,
      },
      0,
      -1,
    );
    this.mediaRecorder.start(100);
    canvasVideoTrack?.requestFrame?.();
    console.log('[EXPORT-DEBUG] MediaRecorder.start() called. State:', this.mediaRecorder.state);
    this.startPendingAudio();
    this.startTime = performance.now();
    this.cancelled = false;

    this.onProgress({
      status: 'encoding',
      progress: 0,
      error: null,
      downloadUrl: null,
      fileName: '',
    });

    // 6. Drive playback — export drives frame advancement itself
    //    (Don't rely on playbackEngine.play() — its internal rAF loop
    //     doesn't reliably advance the controller state visible to getSnapshot())
    this.engine.seekTo(toFrame(0));

    // 7. Render loop — paint to export canvas, advance frame by elapsed time
    let rafCount = 0;
    let frameAccum = 0;
    let lastTimestamp: number | null = null;
    let currentFrame = 0;
    await new Promise<void>((resolve) => {
      const tick = (timestamp: number) => {
        if (this.cancelled) {
          resolve();
          return;
        }

        // First call: just record timestamp
        if (lastTimestamp === null) {
          lastTimestamp = timestamp;
          requestAnimationFrame(tick);
          return;
        }

        // Advance frame accumulator based on elapsed time
        const elapsed = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        const advanced = advanceExportFrameClock({
          currentFrame,
          frameAccum,
          elapsedMs: elapsed,
          fps,
          durationFrames,
        });
        currentFrame = advanced.currentFrame;
        frameAccum = advanced.frameAccum;

        // Seek playback engine so compositor resolves the right clips
        this.engine.seekTo(toFrame(currentFrame));

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
          rafCount,
        );
        canvasVideoTrack?.requestFrame?.();
        rafCount++;

        if (rafCount <= 3 || rafCount % 30 === 0) {
          console.log('[EXPORT-DEBUG] Frame', rafCount, '— currentFrame:', currentFrame, 'progress:', Math.round(progress * 100) + '%');
          try {
            const ctx = this.canvas!.getContext('2d');
            if (ctx) {
              const imageData = ctx.getImageData(0, 0, 1, 1);
              const pixel = imageData.data;
              const isBlank = pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0 && pixel[3] === 0;
              console.log('[EXPORT-DEBUG]   Canvas pixel[0,0] RGBA:', pixel[0], pixel[1], pixel[2], pixel[3], isBlank ? '(BLANK/EMPTY)' : '(has content)');
            }
          } catch (e) {
            console.warn('[EXPORT-DEBUG]   Failed to read canvas pixel:', e);
          }
          if (this.mediaRecorder) {
            console.log('[EXPORT-DEBUG]   MediaRecorder state:', this.mediaRecorder.state, 'chunks so far:', this.recordedChunks.length);
          }
        }

        this.onProgress({
          status: 'encoding',
          progress,
          error: null,
          downloadUrl: null,
          fileName: '',
        });

        if (currentFrame >= durationFrames - 1) {
          resolve();
          return;
        }

        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    });

    // 8. Stop recording
    console.log('[EXPORT-DEBUG] === Render loop ended ===');
    console.log('[EXPORT-DEBUG] Total frames rendered by export loop:', rafCount);
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      console.log('[EXPORT-DEBUG] Calling MediaRecorder.stop(). State before stop:', this.mediaRecorder.state);
      this.mediaRecorder.stop();
    } else {
      console.warn('[EXPORT-DEBUG] MediaRecorder already inactive or null. State:', this.mediaRecorder?.state);
    }
    await recorderDone;
    console.log('[EXPORT-DEBUG] MediaRecorder stopped. Total chunks:', this.recordedChunks.length);
    if (this.cancelled) {
      console.log('[EXPORT-DEBUG] Export was cancelled — aborting blob creation');
      return;
    }

    // 9. Create blob
    let totalBytes = 0;
    for (const chunk of this.recordedChunks) {
      totalBytes += chunk.size;
    }
    console.log('[EXPORT-DEBUG] Total accumulated bytes across', this.recordedChunks.length, 'chunks:', totalBytes, '(' + (totalBytes / 1024 / 1024).toFixed(2) + ' MB)');
    const blob = new Blob(this.recordedChunks, { type: mimeType });
    console.log('[EXPORT-DEBUG] Blob created. Size:', blob.size, 'bytes (' + (blob.size / 1024 / 1024).toFixed(2) + ' MB), type:', blob.type);
    if (blob.size === 0) {
      console.error('[EXPORT-DEBUG] *** CRITICAL: Blob is 0 bytes! MediaRecorder captured nothing. ***');
    }
    const url = URL.createObjectURL(blob);
    const fileName = `timeline-export-${Date.now()}.webm`;
    console.log('[EXPORT-DEBUG] Download URL created:', url.substring(0, 60) + '...');
    console.log('[EXPORT-DEBUG] File name:', fileName);

    const elapsed = ((performance.now() - this.startTime) / 1000).toFixed(1);
    console.log('[EXPORT-DEBUG] === Export complete. Elapsed:', elapsed, 'seconds ===');

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
    this.pendingAudioStarts = [];
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

  private startPendingAudio(): void {
    if (!this.audioCtx || !this.audioDest || this.pendingAudioStarts.length === 0) return;

    const baseTime = this.audioCtx.currentTime;
    for (const { buffer, entry } of this.pendingAudioStarts) {
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;

      const gainNode = this.audioCtx.createGain();
      gainNode.gain.value = entry.gain;

      source.connect(gainNode);
      gainNode.connect(this.audioDest);

      source.start(
        Math.max(this.audioCtx.currentTime, baseTime + entry.when),
        entry.offset,
        entry.duration,
      );
      this.audioSources.push(source);
    }

    console.log('[EXPORT-DEBUG] Started audio sources after MediaRecorder.start():', this.audioSources.length);
    this.pendingAudioStarts = [];
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
    console.log('[EXPORT-DEBUG] startExport called. runnerRef.current:', runnerRef.current ? 'SET (already running)' : 'null (ready to start)');
    if (runnerRef.current) return; // already running

    const runner = new ExportRunner(engine, mediaAssets, (update) => {
      setState((prev) => ({ ...prev, ...update }));
    });
    runnerRef.current = runner;
    console.log('[EXPORT-DEBUG] ExportRunner created, calling runner.run()');

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
        console.error('[EXPORT-DEBUG] *** Export runner threw an error ***', err);
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
