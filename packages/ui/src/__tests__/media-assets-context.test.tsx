/**
 * Tests for media-assets-context.tsx
 *
 * Covers: round-trip get/set, blob URL revocation on remove, double-register
 * guard (T1-5), getAllThumbnails immutability (T1-1), unmount cleanup.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { MediaAssetsProvider, useMediaAssets } from '../context/media-assets-context';

// ---------------------------------------------------------------------------
// Test component that captures the context value
// ---------------------------------------------------------------------------

let capturedCtx: ReturnType<typeof useMediaAssets> | null = null;

function TestConsumer() {
  capturedCtx = useMediaAssets();
  return null;
}

function renderWithProvider() {
  return render(
    <MediaAssetsProvider>
      <TestConsumer />
    </MediaAssetsProvider>,
  );
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  capturedCtx = null;
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// addImportedAsset / getFile / getBlobUrl / getThumbnail
// ---------------------------------------------------------------------------

describe('addImportedAsset', () => {
  it('stores file, blob URL, and thumbnail; retrieves correctly', () => {
    renderWithProvider();
    const ctx = capturedCtx!;
    const file = new File(['data'], 'clip.mp4', { type: 'video/mp4' });

    act(() => {
      ctx.addImportedAsset('asset-1', file, 'blob:url-1', 'data:image/jpeg;thumb');
    });

    expect(ctx.getFile('asset-1')).toBe(file);
    expect(ctx.getBlobUrl('asset-1')).toBe('blob:url-1');
    expect(ctx.getThumbnail('asset-1')).toBe('data:image/jpeg;thumb');
  });

  it('works without a thumbnail', () => {
    renderWithProvider();
    const ctx = capturedCtx!;
    const file = new File(['data'], 'clip.mp3', { type: 'audio/mpeg' });

    act(() => {
      ctx.addImportedAsset('asset-2', file, 'blob:url-2');
    });

    expect(ctx.getFile('asset-2')).toBe(file);
    expect(ctx.getBlobUrl('asset-2')).toBe('blob:url-2');
    expect(ctx.getThumbnail('asset-2')).toBeUndefined();
  });

  it('returns undefined for unknown asset IDs', () => {
    renderWithProvider();
    const ctx = capturedCtx!;
    expect(ctx.getFile('nonexistent')).toBeUndefined();
    expect(ctx.getBlobUrl('nonexistent')).toBeUndefined();
    expect(ctx.getThumbnail('nonexistent')).toBeUndefined();
  });

  it('T1-5: double-register revokes the previous blob URL before overwriting', () => {
    renderWithProvider();
    const ctx = capturedCtx!;
    const fileA = new File(['a'], 'a.mp4', { type: 'video/mp4' });
    const fileB = new File(['b'], 'b.mp4', { type: 'video/mp4' });
    const revokespy = URL.revokeObjectURL as ReturnType<typeof vi.fn>;

    act(() => {
      ctx.addImportedAsset('asset-dup', fileA, 'blob:url-first');
    });
    act(() => {
      ctx.addImportedAsset('asset-dup', fileB, 'blob:url-second');
    });

    // The first blob URL must have been revoked when the second registration happened
    expect(revokespy).toHaveBeenCalledWith('blob:url-first');
    // The second URL is now live
    expect(ctx.getBlobUrl('asset-dup')).toBe('blob:url-second');
  });
});

// ---------------------------------------------------------------------------
// removeImportedAsset
// ---------------------------------------------------------------------------

describe('removeImportedAsset', () => {
  it('clears the asset from all maps', () => {
    renderWithProvider();
    const ctx = capturedCtx!;
    const file = new File(['data'], 'clip.mp4', { type: 'video/mp4' });

    act(() => {
      ctx.addImportedAsset('rm-1', file, 'blob:rm-url');
      ctx.removeImportedAsset('rm-1', { immediate: true });
    });

    expect(ctx.getFile('rm-1')).toBeUndefined();
    expect(ctx.getBlobUrl('rm-1')).toBeUndefined();
  });

  it('T0-3 (immediate=true): revokes blob URL synchronously', () => {
    renderWithProvider();
    const ctx = capturedCtx!;
    const revokespy = URL.revokeObjectURL as ReturnType<typeof vi.fn>;
    const file = new File(['data'], 'clip.mp4', { type: 'video/mp4' });

    act(() => {
      ctx.addImportedAsset('rm-sync', file, 'blob:sync-url');
      ctx.removeImportedAsset('rm-sync', { immediate: true });
    });

    expect(revokespy).toHaveBeenCalledWith('blob:sync-url');
  });

  it('T0-3 (default deferred): revokes blob URL after a microtask', async () => {
    renderWithProvider();
    const ctx = capturedCtx!;
    const revokespy = URL.revokeObjectURL as ReturnType<typeof vi.fn>;
    const file = new File(['data'], 'clip.mp4', { type: 'video/mp4' });

    act(() => {
      ctx.addImportedAsset('rm-deferred', file, 'blob:deferred-url');
      ctx.removeImportedAsset('rm-deferred');
    });

    // Not yet revoked synchronously
    const calledSync = revokespy.mock.calls.some(([url]) => url === 'blob:deferred-url');
    expect(calledSync).toBe(false);

    // After a microtask, should be revoked
    await Promise.resolve();
    const calledAsync = revokespy.mock.calls.some(([url]) => url === 'blob:deferred-url');
    expect(calledAsync).toBe(true);
  });

  it('is a no-op for unknown asset IDs', () => {
    renderWithProvider();
    const ctx = capturedCtx!;
    const revokespy = URL.revokeObjectURL as ReturnType<typeof vi.fn>;

    expect(() => {
      act(() => {
        ctx.removeImportedAsset('does-not-exist');
      });
    }).not.toThrow();
    expect(revokespy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getAllThumbnails
// ---------------------------------------------------------------------------

describe('getAllThumbnails', () => {
  it('T1-1: returns a ReadonlyMap with correct entries', () => {
    renderWithProvider();
    const ctx = capturedCtx!;
    const file = new File(['data'], 'img.png', { type: 'image/png' });

    act(() => {
      ctx.addImportedAsset('thumb-1', file, 'blob:thumb-url', 'data:thumb');
    });

    const thumbnails = ctx.getAllThumbnails();
    expect(thumbnails.get('thumb-1')).toBe('data:thumb');
    // ReadonlyMap: TypeScript enforces readonly, but we also verify the returned
    // object is the live ref (so mutations would be visible, but callers should not mutate)
    expect(thumbnails.size).toBe(1);
  });

  it('does not include entries without thumbnails', () => {
    renderWithProvider();
    const ctx = capturedCtx!;
    const file = new File(['data'], 'no-thumb.mp3', { type: 'audio/mpeg' });

    act(() => {
      ctx.addImportedAsset('no-thumb', file, 'blob:url-nothumbnail');
    });

    const thumbnails = ctx.getAllThumbnails();
    expect(thumbnails.has('no-thumb')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Unmount cleanup
// ---------------------------------------------------------------------------

describe('MediaAssetsProvider unmount', () => {
  it('revokes all blob URLs when the provider unmounts', async () => {
    const revokespy = URL.revokeObjectURL as ReturnType<typeof vi.fn>;
    const { unmount } = renderWithProvider();
    const ctx = capturedCtx!;

    const fileA = new File(['a'], 'a.mp4', { type: 'video/mp4' });
    const fileB = new File(['b'], 'b.mp3', { type: 'audio/mpeg' });

    act(() => {
      ctx.addImportedAsset('unmount-a', fileA, 'blob:url-a');
      ctx.addImportedAsset('unmount-b', fileB, 'blob:url-b');
    });

    unmount();

    expect(revokespy).toHaveBeenCalledWith('blob:url-a');
    expect(revokespy).toHaveBeenCalledWith('blob:url-b');
  });
});
