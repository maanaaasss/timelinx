/**
 * Silence Delete Helper
 *
 * Generates suggested transactions for removing silence from audio.
 * Uses ripple delete to close gaps after removing silence regions.
 */

import type {
  TimelineState,
  TimelineFrame,
  ClipId,
} from '@timelinx/core';
import type {
  SuggestedTransaction,
  DetectedSilence,
} from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SilenceDeleteOptions = {
  /** Amplitude threshold (0-1). Default: 0.01. */
  threshold?: number;
  /** Minimum silence duration in frames. Default: 30. */
  minDuration?: number;
  /** Padding to keep around speech (frames). Default: 5. */
  padding?: number;
  /** Whether to ripple delete gaps. Default: true. */
  ripple?: boolean;
};

// ---------------------------------------------------------------------------
// Silence Delete Helper
// ---------------------------------------------------------------------------

/**
 * Generate suggested transactions for deleting silence from a clip.
 */
export function generateSilenceDeleteSuggestions(
  state: TimelineState,
  clipId: ClipId,
  silenceRegions: DetectedSilence[],
  options: SilenceDeleteOptions = {},
): SuggestedTransaction[] {
  const { padding = 5, ripple = true } = options;
  const suggestions: SuggestedTransaction[] = [];

  // Find the clip
  let targetClip = null;
  for (const track of state.timeline.tracks) {
    const clip = track.clips.find((c) => c.id === clipId);
    if (clip) {
      targetClip = clip;
      break;
    }
  }

  if (!targetClip) {
    return suggestions;
  }

  // Sort silence regions by start frame
  const sortedRegions = [...silenceRegions].sort(
    (a, b) => (a.startFrame as number) - (b.startFrame as number),
  );

  // Merge overlapping regions
  const mergedRegions = mergeSilenceRegions(sortedRegions, padding);

  // Generate delete transactions for each region
  let cumulativeOffset = 0;

  for (let i = 0; i < mergedRegions.length; i++) {
    const region = mergedRegions[i];
    const regionStart = region.startFrame as number;
    const regionEnd = region.endFrame as number;
    const regionDuration = regionEnd - regionStart;

    // Calculate adjusted frame (accounting for previous deletions)
    const adjustedStart = regionStart - cumulativeOffset;

    const transaction = {
      id: `silence-delete-${clipId}-${i}`,
      label: `Delete silence ${i + 1}`,
      timestamp: Date.now(),
      operations: [
        {
          type: 'RESIZE_CLIP' as const,
          clipId,
          edge: 'end' as const,
          newFrame: adjustedStart as TimelineFrame,
        },
      ],
    };

    suggestions.push({
      id: `silence-delete-${clipId}-${i}`,
      label: `Delete silence ${i + 1} (${regionDuration} frames)`,
      category: 'silence',
      confidence: 'high',
      transaction,
      description: `Remove silence from frame ${adjustedStart} to ${regionEnd - cumulativeOffset}`,
      preview: {
        type: 'silence',
        regions: [region],
        totalFrames: regionDuration,
      },
      generatedAt: Date.now(),
      source: 'silence-delete-helper',
    });

    cumulativeOffset += regionDuration;
  }

  // If ripple enabled and multiple regions, create a combined transaction
  if (ripple && mergedRegions.length > 1) {
    const combinedTransaction = createRippleDeleteTransaction(
      clipId,
      mergedRegions,
      targetClip.timelineEnd,
    );

    suggestions.push({
      id: `silence-ripple-all-${clipId}`,
      label: `Delete all silence (${mergedRegions.length} regions)`,
      category: 'silence',
      confidence: 'high',
      transaction: combinedTransaction,
      description: `Remove all ${mergedRegions.length} silence regions and close gaps`,
      preview: {
        type: 'silence',
        regions: mergedRegions,
        totalFrames: mergedRegions.reduce(
          (sum, r) => sum + ((r.endFrame as number) - (r.startFrame as number)),
          0,
        ),
      },
      generatedAt: Date.now(),
      source: 'silence-delete-helper',
    });
  }

  return suggestions;
}

/**
 * Merge overlapping silence regions with padding.
 */
function mergeSilenceRegions(
  regions: DetectedSilence[],
  padding: number,
): DetectedSilence[] {
  if (regions.length === 0) return [];

  const merged: DetectedSilence[] = [];
  let current = { ...regions[0] };

  for (let i = 1; i < regions.length; i++) {
    const next = regions[i];
    const currentEnd = (current.endFrame as number) + padding;
    const nextStart = (next.startFrame as number) - padding;

    if (currentEnd >= nextStart) {
      // Merge
      current = {
        startFrame: current.startFrame,
        endFrame: Math.max(current.endFrame as number, next.endFrame as number) as TimelineFrame,
        amplitude: Math.min(current.amplitude, next.amplitude),
      };
    } else {
      merged.push(current);
      current = { ...next };
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Create a ripple delete transaction for multiple silence regions.
 */
function createRippleDeleteTransaction(
  clipId: ClipId,
  regions: DetectedSilence[],
  clipTimelineEnd: TimelineFrame,
): SuggestedTransaction['transaction'] {
  const totalSilence = regions.reduce((sum, r) => {
    return sum + ((r.endFrame as number) - (r.startFrame as number));
  }, 0);

  const newEndFrame = (clipTimelineEnd as number) - totalSilence;

  const operations = [
    {
      type: 'RESIZE_CLIP' as const,
      clipId,
      edge: 'end' as const,
      newFrame: newEndFrame as TimelineFrame,
    },
  ];

  return {
    id: `ripple-delete-all-${clipId}`,
    label: 'Ripple delete all silence',
    timestamp: Date.now(),
    operations,
  };
}

/**
 * Detect silence in audio data (simple amplitude-based detection).
 */
export function detectSilence(
  audioData: Float32Array,
  sampleRate: number,
  fps: number,
  options: SilenceDeleteOptions = {},
): DetectedSilence[] {
  const { threshold = 0.01, minDuration = 30 } = options;

  if (fps <= 0) {
    throw new Error(`fps must be greater than 0, got ${fps}`);
  }

  const framesPerSecond = fps;
  const samplesPerFrame = sampleRate / framesPerSecond;
  const regions: DetectedSilence[] = [];

  let silenceStart: TimelineFrame | null = null;
  let currentAmplitude = 0;
  let sampleCount = 0;

  for (let i = 0; i < audioData.length; i++) {
    const sample = Math.abs(audioData[i]);
    currentAmplitude += sample;
    sampleCount++;

    if (sampleCount >= samplesPerFrame) {
      const avgAmplitude = currentAmplitude / sampleCount;
      const frame = Math.floor(i / samplesPerFrame) as TimelineFrame;

      if (avgAmplitude < threshold) {
        if (silenceStart === null) {
          silenceStart = frame;
        }
      } else {
        if (silenceStart !== null) {
          const duration = (frame as number) - (silenceStart as number);
          if (duration >= minDuration) {
            regions.push({
              startFrame: silenceStart,
              endFrame: frame,
              amplitude: avgAmplitude,
            });
          }
          silenceStart = null;
        }
      }

      currentAmplitude = 0;
      sampleCount = 0;
    }
  }

  // Handle trailing silence
  if (silenceStart !== null) {
    const frame = Math.floor(audioData.length / samplesPerFrame) as TimelineFrame;
    const duration = (frame as number) - (silenceStart as number);
    if (duration >= minDuration) {
      regions.push({
        startFrame: silenceStart,
        endFrame: frame,
        amplitude: 0,
      });
    }
  }

  return regions;
}
