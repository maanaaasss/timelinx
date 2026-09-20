/**
 * Phase 7 Step 6 — Public API surface audit
 *
 * Import from public API and verify key exports exist at runtime.
 * Prevents accidental omissions from public-api.ts.
 *
 * Non-MVP features are in sub-paths:
 *   - @timelinx/core/serialization (serialize, export formats)
 *   - @timelinx/core/media (subtitles, markers, thumbnails)
 */

import { describe, it, expect } from 'vitest';
import * as Core from '../public-api';
import * as Serialization from '../serialization';
import * as Media from '../media';

describe('Phase 7 — Public API surface', () => {
  it('all key exports are defined', () => {
    // Core engine
    expect(typeof Core.dispatch).toBe('function');
    expect(typeof Core.checkInvariants).toBe('function');
    expect(typeof Core.createTimelineState).toBe('function');
    expect(typeof Core.HistoryStack).toBe('function');

    // Types/factories
    expect(typeof Core.createClip).toBe('function');
    expect(typeof Core.createTrack).toBe('function');
    expect(typeof Core.createTimeline).toBe('function');
    expect(typeof Core.toClipId).toBe('function');
    expect(typeof Core.toTrackId).toBe('function');
    expect(typeof Core.toFrame).toBe('function');
    expect(typeof Core.createTransition).toBe('function');
    expect(typeof Core.createTrackGroup).toBe('function');
    expect(typeof Core.createLinkGroup).toBe('function');

    // Phase 6
    expect(typeof Core.PlayheadController).toBe('function');
    expect(typeof Core.PlaybackEngine).toBe('function');
    expect(typeof Core.KeyboardHandler).toBe('function');
    expect(typeof Core.DEFAULT_KEY_BINDINGS).toBe('object');
    expect(typeof Core.resolveFrame).toBe('function');

    // Phase 7
    expect(typeof Core.IntervalTree).toBe('function');
    expect(typeof Core.TrackIndex).toBe('function');
    expect(typeof Core.SnapIndexManager).toBe('function');
    expect(typeof Core.getVisibleClips).toBe('function');
    expect(typeof Core.diffStates).toBe('function');
  });

  it('serialization sub-path exports are defined', () => {
    expect(typeof Serialization.serializeTimeline).toBe('function');
    expect(typeof Serialization.deserializeTimeline).toBe('function');
    expect(typeof Serialization.remapAssetPaths).toBe('function');
    expect(typeof Serialization.findOfflineAssets).toBe('function');
  });

  it('media sub-path exports are defined', () => {
    expect(typeof Media.findMarkersByColor).toBe('function');
    expect(typeof Media.findMarkersByLabel).toBe('function');
  });
});
