/**
 * Phase 4 Step 1 — Type and factory tests (no dispatch, no state).
 * Pure shape and default checks.
 */

import { describe, it, expect } from 'vitest';
import { createTransition, toTransitionId } from '../types/transition';
import { createTrackGroup, toTrackGroupId } from '../types/track-group';
import { createLinkGroup, toLinkGroupId } from '../types/link-group';
import { createClip, toClipId } from '../types/clip';
import { createTrack } from '../types/track';
import { createTimeline } from '../types/timeline';
import { toFrame } from '../types/frame';

describe('Phase 4 — Transition', () => {
  it('createTransition defaults: alignment centerOnCut, easing linear', () => {
    const t = createTransition(toTransitionId('tr-1'), 'dissolve', 15);
    expect(t.alignment).toBe('centerOnCut');
    expect(t.easing).toBe('linear');
  });
});

describe('Phase 4 — TrackGroup', () => {
  it('createTrackGroup defaults: collapsed false, trackIds []', () => {
    const g = createTrackGroup(toTrackGroupId('grp-1'), 'Group');
    expect(g.collapsed).toBe(false);
    expect(g.trackIds).toEqual([]);
  });
});

describe('Phase 4 — LinkGroup', () => {
  it('createLinkGroup stores clipIds', () => {
    const g = createLinkGroup(toLinkGroupId('link-1'), [toClipId('c1'), toClipId('c2')]);
    expect(g.clipIds).toHaveLength(2);
    expect(g.clipIds[0]).toBe('c1');
    expect(g.clipIds[1]).toBe('c2');
  });
});

describe('Phase 4 — Backward compat & metadata (createClip, createTrack, createTimeline)', () => {
  it('createClip works with minimal fields', () => {
    const clip = createClip({
      id: 'c1',
      assetId: 'a1',
      trackId: 't1',
      timelineStart: toFrame(0),
      timelineEnd: toFrame(100),
      mediaIn: toFrame(0),
      mediaOut: toFrame(100),
    });
    expect(clip.id).toBe('c1');
    expect(clip.timelineStart).toBe(0);
    expect(clip.metadata).toBeUndefined();
    expect(clip.transition).toBeUndefined();
  });

  it('createClip accepts arbitrary metadata bag', () => {
    const clip = createClip({
      id: 'c2',
      assetId: 'a1',
      trackId: 't1',
      timelineStart: toFrame(0),
      timelineEnd: toFrame(100),
      mediaIn: toFrame(0),
      mediaOut: toFrame(100),
      metadata: {
        transform: { x: 10, y: 20 },
        tags: ['intro', 'vfx'],
      },
    });
    expect(clip.metadata).toEqual({
      transform: { x: 10, y: 20 },
      tags: ['intro', 'vfx'],
    });
  });

  it('createTrack still works with no new fields', () => {
    const track = createTrack({ id: 't1', name: 'V1', type: 'video' });
    expect(track.id).toBe('t1');
    expect(track.name).toBe('V1');
    expect(track.blendMode).toBeUndefined();
    expect(track.opacity).toBeUndefined();
    expect(track.groupId).toBeUndefined();
  });

  it('createTimeline still works with no new fields', () => {
    const tl = createTimeline({
      id: 'tl1',
      name: 'Seq',
      fps: 30,
      duration: toFrame(1000),
    });
    expect(tl.id).toBe('tl1');
    expect(tl.trackGroups).toBeUndefined();
    expect(tl.linkGroups).toBeUndefined();
  });
});
