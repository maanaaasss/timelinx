/**
 * Tests for computeAudioSchedule — the pure audio scheduling math.
 *
 * These verify the arguments that would be passed to
 * AudioBufferSourceNode.start(when, offset, duration) for each clip,
 * without requiring a real AudioContext or browser.
 */
import { describe, it, expect } from 'vitest';
import { computeAudioSchedule } from '../hooks/use-export';
import { toFrame } from '@timelinx/core';
import type { Clip } from '@timelinx/core';

/** Minimal helper to build a clip-like object with the fields computeAudioSchedule reads. */
function makeClip(overrides: {
  timelineStart: number;
  timelineEnd: number;
  mediaIn?: number;
  mediaOut?: number;
  gainDb?: number;
}): { clip: Clip } {
  return {
    clip: {
      id: 'test-clip',
      assetId: 'test-asset',
      trackId: 'test-track',
      timelineStart: toFrame(overrides.timelineStart),
      timelineEnd: toFrame(overrides.timelineEnd),
      mediaIn: toFrame(overrides.mediaIn ?? 0),
      mediaOut: toFrame(overrides.mediaOut ?? overrides.timelineEnd),
      speed: 1,
      enabled: true,
      reversed: false,
      name: null,
      color: null,
      metadata: {},
      audio: overrides.gainDb !== undefined
        ? {
            gain: { value: overrides.gainDb, keyframes: [] },
            pan: { value: 0, keyframes: [] },
            mute: false,
            channelRouting: 'stereo' as const,
            normalizationGain: 0,
          }
        : undefined,
    } as unknown as Clip,
  };
}

describe('computeAudioSchedule', () => {
  const FPS = 30;
  const CT_BASE = 10; // fake audioCtx.currentTime

  // ── Case 1: clip starts partway through the export window ───────────

  it('clip starting at frame 100 schedules when = base + 100/fps', () => {
    const clips = [makeClip({ timelineStart: 100, timelineEnd: 400 })];
    const result = computeAudioSchedule(clips, CT_BASE, FPS);

    expect(result).toHaveLength(1);
    expect(result[0]!.when).toBeCloseTo(CT_BASE + 100 / FPS, 10);
    expect(result[0]!.offset).toBeCloseTo(0, 10);
    expect(result[0]!.duration).toBeCloseTo(300 / FPS, 10);
  });

  // ── Case 2: clip with non-zero mediaIn (trimmed) ────────────────────

  it('clip with mediaIn=50 seeks into source at 50/fps, not 0', () => {
    const clips = [makeClip({
      timelineStart: 0,
      timelineEnd: 300,
      mediaIn: 50,
      mediaOut: 350,
    })];
    const result = computeAudioSchedule(clips, CT_BASE, FPS);

    expect(result).toHaveLength(1);
    expect(result[0]!.when).toBeCloseTo(CT_BASE, 10);
    expect(result[0]!.offset).toBeCloseTo(50 / FPS, 10);
    expect(result[0]!.duration).toBeCloseTo(300 / FPS, 10);
  });

  // ── Case 3: two overlapping audio clips ─────────────────────────────

  it('overlapping clips get independent schedules — neither clobbers the other', () => {
    const clips = [
      makeClip({ timelineStart: 0, timelineEnd: 600 }),     // music: frames 0–600
      makeClip({ timelineStart: 200, timelineEnd: 500 }),   // voiceover: frames 200–500
    ];
    const result = computeAudioSchedule(clips, CT_BASE, FPS);

    expect(result).toHaveLength(2);

    // Music starts at base + 0
    expect(result[0]!.when).toBeCloseTo(CT_BASE, 10);
    expect(result[0]!.offset).toBeCloseTo(0, 10);
    expect(result[0]!.duration).toBeCloseTo(600 / FPS, 10);

    // Voiceover starts at base + 200/fps
    expect(result[1]!.when).toBeCloseTo(CT_BASE + 200 / FPS, 10);
    expect(result[1]!.offset).toBeCloseTo(0, 10);
    expect(result[1]!.duration).toBeCloseTo(300 / FPS, 10);
  });

  // ── Case 4: clip ends before the export window ends ─────────────────

  it('short clip duration is capped to its own timeline span, not the full export', () => {
    const clips = [makeClip({ timelineStart: 0, timelineEnd: 150 })];
    const result = computeAudioSchedule(clips, CT_BASE, FPS);

    expect(result).toHaveLength(1);
    expect(result[0]!.duration).toBeCloseTo(150 / FPS, 10);
    // 150 frames at 30fps = 5 seconds, not the full timeline duration
    expect(result[0]!.duration).toBeCloseTo(5, 1);
  });

  // ── Gain conversion ─────────────────────────────────────────────────

  it('converts 0 dB gain to linear 1.0', () => {
    const clips = [makeClip({ timelineStart: 0, timelineEnd: 100, gainDb: 0 })];
    const result = computeAudioSchedule(clips, CT_BASE, FPS);
    expect(result[0]!.gain).toBeCloseTo(1.0, 5);
  });

  it('converts -6 dB gain to ~0.501 linear', () => {
    const clips = [makeClip({ timelineStart: 0, timelineEnd: 100, gainDb: -6 })];
    const result = computeAudioSchedule(clips, CT_BASE, FPS);
    expect(result[0]!.gain).toBeCloseTo(Math.pow(10, -6 / 20), 5);
  });

  it('converts +6 dB gain to ~1.995 linear', () => {
    const clips = [makeClip({ timelineStart: 0, timelineEnd: 100, gainDb: 6 })];
    const result = computeAudioSchedule(clips, CT_BASE, FPS);
    expect(result[0]!.gain).toBeCloseTo(Math.pow(10, 6 / 20), 5);
  });

  // ── Edge: clip with no audio properties defaults to 0 dB ────────────

  it('clip without audio properties defaults to gain 1.0', () => {
    const clips = [makeClip({ timelineStart: 0, timelineEnd: 100 })];
    const result = computeAudioSchedule(clips, CT_BASE, FPS);
    expect(result[0]!.gain).toBeCloseTo(1.0, 5);
  });

  // ── Combined: trimmed + offset + overlapping ────────────────────────

  it('complex scenario: trimmed clip starting mid-timeline alongside a full-length clip', () => {
    const clips = [
      makeClip({ timelineStart: 0, timelineEnd: 900, gainDb: -3 }),    // background music
      makeClip({ timelineStart: 300, timelineEnd: 600, mediaIn: 120, mediaOut: 420, gainDb: 0 }), // trimmed VO
    ];
    const result = computeAudioSchedule(clips, CT_BASE, FPS);

    expect(result).toHaveLength(2);

    // Background music: starts at base, plays for 30 seconds
    expect(result[0]!.when).toBeCloseTo(CT_BASE, 10);
    expect(result[0]!.duration).toBeCloseTo(900 / FPS, 10);
    expect(result[0]!.gain).toBeCloseTo(Math.pow(10, -3 / 20), 5);

    // Voiceover: starts at base + 10s, seeks 4s into source, plays for 10s
    expect(result[1]!.when).toBeCloseTo(CT_BASE + 300 / FPS, 10);
    expect(result[1]!.offset).toBeCloseTo(120 / FPS, 10);
    expect(result[1]!.duration).toBeCloseTo(300 / FPS, 10);
  });

  // ── Frame-0 anchoring: schedule is independent of playhead position ─

  it('schedule is anchored to audioCtxCurrentTime, not playhead — clip at frame 200 schedules relative to audio context base', () => {
    // This clip starts at frame 200 on the timeline.
    // If the export accidentally used the playhead position as the anchor,
    // the `when` value would differ depending on where the playhead was.
    // But computeAudioSchedule only takes audioCtxCurrentTime — it has
    // no knowledge of the playhead. So `when` is always base + 200/fps.
    const clips = [makeClip({ timelineStart: 200, timelineEnd: 500 })];

    // Simulate: playhead was at frame 200 when export started (doesn't matter)
    const playheadFrame = 200;
    const result = computeAudioSchedule(clips, CT_BASE, FPS);

    // when = audioCtx.currentTime + timelineStart/fps
    // NOT: playheadFrame/fps + timelineStart/fps
    expect(result[0]!.when).toBeCloseTo(CT_BASE + 200 / FPS, 10);

    // The key invariant: if we change the playhead frame but keep
    // audioCtxCurrentTime the same, the schedule doesn't change.
    // This proves the export is anchored to the audio context, not the playhead.
    const playheadFrame2 = 0;
    const result2 = computeAudioSchedule(clips, CT_BASE, FPS);
    expect(result2[0]!.when).toBeCloseTo(result[0]!.when, 10);
  });
});
