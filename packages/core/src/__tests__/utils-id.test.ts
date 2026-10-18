/**
 * ID generation utilities — coverage for src/utils/id.ts and src/utils/id-phase2.ts
 *
 * These files were at 0% coverage. Tests verify:
 *   - generateId produces prefixed, incrementing IDs
 *   - resetIdCounter resets the counter for deterministic output
 *   - Each typed generator (clip, track, timeline, asset) uses the right prefix
 *   - Phase-2 generators (linkgroup, group, marker) use the right prefix
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateId,
  generateClipId,
  generateTrackId,
  generateTimelineId,
  generateAssetId,
  resetIdCounter,
} from '../utils/id';
import {
  generateLinkGroupId,
  generateGroupId,
  generateMarkerId,
} from '../utils/id-phase2';

beforeEach(() => {
  // Ensure a clean counter for every test so output is deterministic.
  resetIdCounter();
});

describe('generateId', () => {
  it('returns "<prefix>_<N>" starting from 1', () => {
    expect(generateId('foo')).toBe('foo_1');
    expect(generateId('foo')).toBe('foo_2');
  });

  it('increments independently of the prefix used', () => {
    expect(generateId('a')).toBe('a_1');
    expect(generateId('b')).toBe('b_2');
    expect(generateId('a')).toBe('a_3');
  });
});

describe('resetIdCounter', () => {
  it('resets the shared counter back to 0', () => {
    generateId('x');
    generateId('x');
    resetIdCounter();
    expect(generateId('x')).toBe('x_1');
  });
});

describe('generateClipId', () => {
  it('returns a string starting with "clip_"', () => {
    const id = generateClipId();
    expect(id).toMatch(/^clip_\d+$/);
  });
});

describe('generateTrackId', () => {
  it('returns a string starting with "track_"', () => {
    const id = generateTrackId();
    expect(id).toMatch(/^track_\d+$/);
  });
});

describe('generateTimelineId', () => {
  it('returns a string starting with "timeline_"', () => {
    const id = generateTimelineId();
    expect(id).toMatch(/^timeline_\d+$/);
  });
});

describe('generateAssetId', () => {
  it('returns a string starting with "asset_"', () => {
    const id = generateAssetId();
    expect(id).toMatch(/^asset_\d+$/);
  });
});

describe('id-phase2 — generateLinkGroupId', () => {
  it('returns a string starting with "linkgroup_"', () => {
    const id = generateLinkGroupId();
    expect(id).toMatch(/^linkgroup_\d+$/);
  });
});

describe('id-phase2 — generateGroupId', () => {
  it('returns a string starting with "group_"', () => {
    const id = generateGroupId();
    expect(id).toMatch(/^group_\d+$/);
  });
});

describe('id-phase2 — generateMarkerId', () => {
  it('returns a string starting with "marker_"', () => {
    const id = generateMarkerId();
    expect(id).toMatch(/^marker_\d+$/);
  });
});

describe('id uniqueness across generators', () => {
  it('each call returns a unique value', () => {
    const ids = [
      generateClipId(),
      generateClipId(),
      generateTrackId(),
      generateLinkGroupId(),
      generateMarkerId(),
    ];
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
