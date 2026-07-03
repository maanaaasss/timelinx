/**
 * Scene Detection Helper
 *
 * Generates marker suggestions for scene changes in video.
 * Can be used with any scene detection adapter.
 */

import type {
  TimelineFrame,
  MarkerId,
} from '@timelinx/core';
import type {
  SuggestedTransaction,
  DetectedScene,
} from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SceneMarkerOptions = {
  /** Marker color. Default: '#ff6b6b'. */
  color?: string;
  /** Marker label prefix. Default: 'Scene'. */
  labelPrefix?: string;
  /** Minimum confidence to create marker. Default: 0.5. */
  minConfidence?: number;
};

// ---------------------------------------------------------------------------
// Scene Detection Helper
// ---------------------------------------------------------------------------

/**
 * Generate suggested transactions for adding scene markers.
 */
export function generateSceneMarkerSuggestions(
  scenes: DetectedScene[],
  options: SceneMarkerOptions = {},
): SuggestedTransaction[] {
  const {
    labelPrefix = 'Scene',
    minConfidence = 0.5,
  } = options;

  const suggestions: SuggestedTransaction[] = [];

  // Filter scenes by confidence
  const validScenes = scenes.filter((s) => s.confidence >= minConfidence);

  if (validScenes.length === 0) {
    return suggestions;
  }

  // Generate individual marker suggestions
  for (let i = 0; i < validScenes.length; i++) {
    const scene = validScenes[i];
    const frame = scene.frame as number;

    const marker = createSceneMarker(scene.frame, i + 1, options);

    const transaction = {
      id: `add-scene-marker-${i}`,
      label: `Add ${labelPrefix} ${i + 1} marker`,
      timestamp: Date.now(),
      operations: [
        {
          type: 'ADD_MARKER' as const,
          marker,
        },
      ],
    };

    suggestions.push({
      id: `scene-marker-${i}`,
      label: `${labelPrefix} ${i + 1} at frame ${frame}`,
      category: 'scene',
      confidence: scene.confidence >= 0.8 ? 'high' : 'medium',
      transaction,
      description: scene.description || `Add marker at scene change (frame ${frame})`,
      preview: {
        type: 'scene',
        scenes: [scene],
      },
      generatedAt: Date.now(),
      source: 'scene-detection-helper',
    });
  }

  // Generate combined transaction for all markers
  if (validScenes.length > 1) {
    const allMarkers = validScenes.map(
      (scene, i) => createSceneMarker(scene.frame, i + 1, options),
    );

    const combinedTransaction = {
      id: `add-all-scene-markers`,
      label: `Add all ${validScenes.length} scene markers`,
      timestamp: Date.now(),
      operations: allMarkers.map((marker) => ({
        type: 'ADD_MARKER' as const,
        marker,
      })),
    };

    suggestions.push({
      id: 'scene-markers-all',
      label: `Add all ${validScenes.length} scene markers`,
      category: 'scene',
      confidence: 'high',
      transaction: combinedTransaction,
      description: `Add markers at ${validScenes.length} detected scene changes`,
      preview: {
        type: 'scene',
        scenes: validScenes,
      },
      generatedAt: Date.now(),
      source: 'scene-detection-helper',
    });
  }

  return suggestions;
}

/**
 * Simple scene change detection based on frame difference.
 * This is a placeholder - real implementations would use more sophisticated algorithms.
 */
export function detectSceneChanges(
  frames: ImageData[],
  threshold: number = 0.3,
  minSceneLength: number = 10,
): DetectedScene[] {
  const scenes: DetectedScene[] = [];

  if (threshold <= 0) {
    throw new Error(`threshold must be greater than 0, got ${threshold}`);
  }

  if (frames.length < 2) {
    return scenes;
  }

  let lastSignificantChange = 0;

  for (let i = 1; i < frames.length; i++) {
    const diff = calculateFrameDifference(frames[i - 1], frames[i]);

    if (diff > threshold && i - lastSignificantChange >= minSceneLength) {
      scenes.push({
        frame: i as TimelineFrame,
        confidence: Math.min(diff / threshold, 1),
        description: `Scene change detected (difference: ${(diff * 100).toFixed(1)}%)`,
      });
      lastSignificantChange = i;
    }
  }

  return scenes;
}

/**
 * Calculate difference between two frames.
 * Returns a value between 0 and 1.
 */
function calculateFrameDifference(frame1: ImageData, frame2: ImageData): number {
  if (frame1.width !== frame2.width || frame1.height !== frame2.height) {
    return 1; // Completely different if sizes don't match
  }

  const data1 = frame1.data;
  const data2 = frame2.data;
  let totalDiff = 0;
  const pixelCount = data1.length / 4;

  for (let i = 0; i < data1.length; i += 4) {
    const rDiff = Math.abs(data1[i] - data2[i]);
    const gDiff = Math.abs(data1[i + 1] - data2[i + 1]);
    const bDiff = Math.abs(data1[i + 2] - data2[i + 2]);

    totalDiff += (rDiff + gDiff + bDiff) / (3 * 255);
  }

  return totalDiff / pixelCount;
}

/**
 * Create a marker for a scene change.
 */
export function createSceneMarker(
  frame: TimelineFrame,
  sceneNumber: number,
  options: SceneMarkerOptions = {},
) {
  const { color = '#ff6b6b', labelPrefix = 'Scene' } = options;

  return {
    type: 'point' as const,
    id: `scene-marker-${sceneNumber}` as MarkerId,
    frame,
    label: `${labelPrefix} ${sceneNumber}`,
    color,
    scope: 'global' as const,
    linkedClipId: null,
  };
}
