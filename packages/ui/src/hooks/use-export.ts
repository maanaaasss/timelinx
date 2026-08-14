/**
 * useExport hook — Phase 11
 *
 * Drives real-time export via canvas.captureStream() + MediaRecorder.
 * Handles audio routing via Web Audio API, progress tracking, and
 * cancel/cleanup.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
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
  return typeof canvas.captureStream === 'function' && typeof MediaRecorder !== 'undefined';
}

function getSupportedMimeType(hasAudio: boolean): string | null {
  // T1-4: Include MP4 types so Safari (which only supports video/mp4) can export.
  // WebM types are tried first because they produce smaller files in Chrome/Firefox.
  const types = hasAudio
    ? [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
      ]
    : [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4;codecs=avc1',
        'video/mp4',
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
      // T2-1: Explicit parenthesization to avoid operator precedence ambiguity.
      // Skip generator assets and non-audio file assets.
      if (!asset || asset.kind === 'generator' || asset.mediaType !== 'audio') continue;
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

async function loadAudioBuffer(audioCtx: AudioContext, src: string): Promise<AudioBuffer | null> {
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
    const clipDurationSec = ((clip.timelineEnd as number) - (clip.timelineStart as number)) / fps;
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
  // T1-2: Guard against double-cleanup (cancel() + .finally() both call cleanup())
  private cleaned = false;
  private startTime = 0;
  private onProgress: (state: ExportState) => void;
  // T0-5: Store loaded audio buffers for scheduling at start time (not load time)
  private loadedAudioBuffers: Array<{ info: AudioClipInfo; buffer: AudioBuffer }> = [];

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
    const durationFrames = getExportDurationFrames(state);

    if (import.meta.env.DEV) {
      const timelineDurationFrames = (state.timeline.duration as number) || 1;
      console.log('[EXPORT-DEBUG] === Export pipeline starting ===');
      console.log('[EXPORT-DEBUG] timeline.duration (frames):', timelineDurationFrames);
      console.log('[EXPORT-DEBUG] export duration from content (frames):', durationFrames);
      console.log('[EXPORT-DEBUG] timeline.fps:', fps);
      console.log('[EXPORT-DEBUG] computed duration (seconds):', durationFrames / fps);
      console.log('[EXPORT-DEBUG] track count:', state.timeline.tracks.length);
      for (const track of state.timeline.tracks) {
        console.log(
          '[EXPORT-DEBUG]   track:',
          track.id,
          'type:',
          track.type,
          'clips:',
          track.clips.length,
          'muted:',
          track.muted,
        );
      }
    }

    // 1. Create export canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1920;
    this.canvas.height = 1080;

    // 2. Set up canvas capture
    let videoStream = this.canvas.captureStream(0);
    let canvasVideoTrack = videoStream.getVideoTracks()[0] as
      (MediaStreamTrack & { requestFrame?: () => void }) | undefined;
    if (!canvasVideoTrack?.requestFrame) {
      videoStream.getTracks().forEach((track) => track.stop());
      videoStream = this.canvas.captureStream(fps);
      canvasVideoTrack = videoStream.getVideoTracks()[0] as
        (MediaStreamTrack & { requestFrame?: () => void }) | undefined;
    }
    if (import.meta.env.DEV) {
      console.log('[EXPORT-DEBUG] Export canvas:', this.canvas.width, 'x', this.canvas.height);
      console.log(
        '[EXPORT-DEBUG] captureStream video tracks:',
        videoStream.getVideoTracks().length,
      );
      console.log(
        '[EXPORT-DEBUG] requestFrame supported:',
        Boolean(canvasVideoTrack?.requestFrame),
      );
    }

    // 3. Set up audio
    // T0-5: Audio buffers are loaded here, but scheduling is deferred to
    // startPendingAudio() (called after MediaRecorder.start()) so the
    // schedule is computed using the actual AudioContext.currentTime at the
    // moment recording begins, not the earlier load time. This eliminates
    // the 50–500ms A/V sync offset caused by audio loading duration.
    let combinedStream: MediaStream = videoStream;
    let hasAudio = false;
    const audioClips = collectAudioClips(state, this.mediaAssets);
    try {
      if (audioClips.length > 0) {
        this.audioCtx = new AudioContext();
        this.audioDest = this.audioCtx.createMediaStreamDestination();
        await this.audioCtx.resume?.();

        for (let i = 0; i < audioClips.length; i++) {
          const info = audioClips[i]!;
          const buffer = await loadAudioBuffer(this.audioCtx, info.src);
          if (buffer) {
            this.loadedAudioBuffers.push({ info, buffer });
            if (import.meta.env.DEV) {
              console.log(
                '[EXPORT-DEBUG] Loaded audio clip:',
                info.clip.id,
                'duration:',
                buffer.duration,
              );
            }
          } else if (import.meta.env.DEV) {
            console.warn('[EXPORT-DEBUG] FAILED to load audio clip:', info.clip.id);
          }
        }

        if (this.loadedAudioBuffers.length > 0) {
          hasAudio = true;
          const audioTracks = this.audioDest.stream.getAudioTracks();
          combinedStream = new MediaStream([...videoStream.getVideoTracks(), ...audioTracks]);
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[EXPORT-DEBUG] Audio setup failed — proceeding with video only', err);
      }
      combinedStream = videoStream;
      hasAudio = false;
    }
    this.stream = combinedStream;
    const mimeType = getSupportedMimeType(hasAudio);
    if (!mimeType) {
      throw new Error('No supported video MIME type found for MediaRecorder');
    }
    if (import.meta.env.DEV) {
      console.log('[EXPORT-DEBUG] Selected MIME type:', mimeType);
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

    // 5. Seek to start, prime the canvas, and begin recording
    this.engine.seekTo(toFrame(0));
    renderCompositorFrame(
      {
        canvas: this.canvas!,
        engine: this.engine,
        mediaAssets: this.mediaAssets,
        pool: this.pool,
        lastSeekRef: this.lastSeekRef,
      },
      0,
    );
    this.mediaRecorder.start(100);
    canvasVideoTrack?.requestFrame?.();
    // T0-5: Start audio AFTER MediaRecorder.start() so the schedule is
    // computed against the actual AudioContext.currentTime at recording start.
    this.startPendingAudio(fps);
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
    //    (engine.seekTo drives the compositor's resolveFrame; do NOT rely
    //     on playbackEngine.play() which has its own rAF loop)
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
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    await recorderDone;
    if (this.cancelled) return;

    // 9. Create blob
    const blob = new Blob(this.recordedChunks, { type: mimeType });
    if (import.meta.env.DEV && blob.size === 0) {
      console.error('[EXPORT-DEBUG] CRITICAL: Blob is 0 bytes — MediaRecorder captured nothing.');
    }
    const url = URL.createObjectURL(blob);
    // Determine file extension from MIME type
    const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
    const fileName = `timeline-export-${Date.now()}.${ext}`;

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
    // T1-2: Idempotent guard — cancel() and .finally() both call cleanup();
    // the second call must be a no-op to avoid double-stopping audio sources.
    if (this.cleaned) return;
    this.cleaned = true;

    for (const source of this.audioSources) {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
    }
    this.audioSources = [];
    this.loadedAudioBuffers = [];
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
    this.lastSeekRef.clear();
  }

  private startPendingAudio(fps: number): void {
    // T0-5: Compute the audio schedule HERE, using the actual AudioContext
    // currentTime at the moment MediaRecorder has started recording.
    // Previously, computeAudioSchedule was called during audio loading with
    // audioCtxCurrentTime=0, then startPendingAudio added baseTime on top —
    // producing an offset equal to the audio loading duration (50–500ms).
    // Now: schedule is computed at actual start time, so when=0 means
    // "play this clip starting at the very beginning of the recording",
    // which is accurate.
    if (!this.audioCtx || !this.audioDest || this.loadedAudioBuffers.length === 0) return;

    const baseTime = this.audioCtx.currentTime;
    const schedule = computeAudioSchedule(
      this.loadedAudioBuffers.map(({ info }) => info),
      baseTime,
      fps,
    );

    for (let i = 0; i < this.loadedAudioBuffers.length; i++) {
      const { buffer } = this.loadedAudioBuffers[i]!;
      const entry = schedule[i]!;
      const offset = Math.min(entry.offset, Math.max(0, buffer.duration));
      const duration = Math.min(entry.duration, Math.max(0, buffer.duration - offset));
      if (duration <= 0) continue;

      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;

      const gainNode = this.audioCtx.createGain();
      gainNode.gain.value = entry.gain;

      source.connect(gainNode);
      gainNode.connect(this.audioDest);

      source.start(Math.max(this.audioCtx.currentTime, entry.when), offset, duration);
      this.audioSources.push(source);
    }
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

  // T2-3: If the engine is replaced (e.g. user loads a demo/blank project)
  // while an export is in-flight, cancel it. The running ExportRunner holds a
  // captured reference to the old engine; continuing would produce incorrect output.
  const cancelExportRef = useRef<() => void>(() => {});
  useEffect(() => {
    cancelExportRef.current();
  }, [engine]);

  const startExport = useCallback(() => {
    if (import.meta.env.DEV) {
      console.log(
        '[EXPORT-DEBUG] startExport called. runnerRef.current:',
        runnerRef.current ? 'SET (already running)' : 'null (ready to start)',
      );
    }
    if (runnerRef.current) return; // already running

    const runner = new ExportRunner(engine, mediaAssets, (update) => {
      setState((prev) => ({ ...prev, ...update }));
    });
    runnerRef.current = runner;
    if (import.meta.env.DEV) {
      console.log('[EXPORT-DEBUG] ExportRunner created, calling runner.run()');
    }

    setState((prev) => {
      // T0-4: Revoke the previous export's download URL before overwriting
      // state so the blob (potentially 1-100 MB) is freed from memory.
      if (prev.downloadUrl) {
        URL.revokeObjectURL(prev.downloadUrl);
      }
      return {
        status: 'preparing',
        progress: 0,
        error: null,
        downloadUrl: null,
        fileName: '',
      };
    });

    runner
      .run()
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.error('[EXPORT-DEBUG] Export runner threw an error', err);
        }
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
    setState((prev) => {
      // T0-4: Revoke export download URL on cancel too
      if (prev.downloadUrl) {
        URL.revokeObjectURL(prev.downloadUrl);
      }
      return {
        status: 'idle',
        progress: 0,
        error: null,
        downloadUrl: null,
        fileName: '',
      };
    });
  }, []);

  // Keep the ref in sync so the engine-change effect can call the latest version
  cancelExportRef.current = cancelExport;

  return {
    state,
    startExport,
    cancelExport,
    isSupported: checkExportSupport(),
  };
}
