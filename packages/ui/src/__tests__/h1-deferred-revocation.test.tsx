/**
 * Tests for the H1 deferred-revocation fix in media-assets-context.tsx
 *
 * The original finding (H1) identified a specific race:
 *   1. The compositor calls getBlobUrl(assetId) → gets a live URL
 *   2. removeImportedAsset(assetId) is called (e.g. user deletes the clip)
 *   3. URL.revokeObjectURL fires immediately → <video>.src becomes invalid
 *   4. drawImage in the same synchronous frame reads stale data → black frame
 *
 * The fix (T0-3) defers revocation by one microtask so that any synchronous
 * draw work that was already in progress completes before the URL is revoked.
 *
 * The test here simulates the real timing: a "draw" starts synchronously (reads
 * the URL), then removeImportedAsset is called, then we verify the URL is still
 * live at the end of the synchronous block (deferred) and only revoked after
 * the microtask queue drains.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { MediaAssetsProvider, useMediaAssets } from '../context/media-assets-context';

// ---------------------------------------------------------------------------
// Test harness
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

beforeEach(() => {
  capturedCtx = null;
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// H1: The concurrent draw + delete race
// ---------------------------------------------------------------------------

describe('H1: deferred revocation protects concurrent draw-then-delete', () => {
  it('URL remains live during the synchronous block after removeImportedAsset is called (default deferred path)', async () => {
    renderWithProvider();
    const ctx = capturedCtx!;
    const revokespy = URL.revokeObjectURL as ReturnType<typeof vi.fn>;
    const file = new File(['data'], 'clip.mp4', { type: 'video/mp4' });

    act(() => {
      ctx.addImportedAsset('clip-h1', file, 'blob:h1-url');
    });

    // Simulate what the compositor does synchronously in a render frame:
    //   1. Read the blob URL (this is what renderVideo does at the start of drawImage)
    const urlAtDrawStart = ctx.getBlobUrl('clip-h1');
    expect(urlAtDrawStart).toBe('blob:h1-url');

    // 2. While the draw is logically "in progress" (we're still in the same
    //    synchronous call stack), the user deletes the asset.
    act(() => {
      ctx.removeImportedAsset('clip-h1'); // deferred by default
    });

    // 3. Verify: URL is NOT yet revoked synchronously.
    //    If it were, any concurrent drawImage using this URL would get a black frame.
    const revokedSynchronously = revokespy.mock.calls.some(
      ([url]) => url === 'blob:h1-url',
    );
    expect(revokedSynchronously).toBe(false);

    // 4. The context state is cleared synchronously (getBlobUrl returns undefined)
    //    so no new consumers can start using the URL after removal.
    expect(ctx.getBlobUrl('clip-h1')).toBeUndefined();

    // 5. After the microtask queue drains, the URL IS revoked.
    await Promise.resolve();

    const revokedAfterMicrotask = revokespy.mock.calls.some(
      ([url]) => url === 'blob:h1-url',
    );
    expect(revokedAfterMicrotask).toBe(true);
  });

  it('a draw that started before removeImportedAsset can complete without the URL being invalidated mid-draw', async () => {
    renderWithProvider();
    const ctx = capturedCtx!;
    const revokespy = URL.revokeObjectURL as ReturnType<typeof vi.fn>;
    const file = new File(['data'], 'video.mp4', { type: 'video/mp4' });

    act(() => {
      ctx.addImportedAsset('clip-draw', file, 'blob:draw-url');
    });

    // Simulate: compositor frame begins (reads URL), then three synchronous
    // operations happen before the frame ends — representing multiple layers
    // in a composite operation all reading from the same asset.
    const urlStep1 = ctx.getBlobUrl('clip-draw'); // layer 1 read
    act(() => { ctx.removeImportedAsset('clip-draw'); }); // delete fires between layers
    const urlStep2 = ctx.getBlobUrl('clip-draw'); // layer 2 read AFTER delete

    // Layer 1 captured the URL before delete — it should have gotten a value
    expect(urlStep1).toBe('blob:draw-url');

    // Layer 2 reads after delete — getBlobUrl now returns undefined (correct:
    // no new reads should start using the revoked URL)
    expect(urlStep2).toBeUndefined();

    // URL is still NOT revoked synchronously — layer 1's draw is safe to complete
    const revokedSync = revokespy.mock.calls.some(([url]) => url === 'blob:draw-url');
    expect(revokedSync).toBe(false);

    // Drain microtask queue — now revocation happens
    await Promise.resolve();
    const revokedAsync = revokespy.mock.calls.some(([url]) => url === 'blob:draw-url');
    expect(revokedAsync).toBe(true);
  });

  it('the window of protection is exactly one microtask — a second Promise.resolve tick is after revocation', async () => {
    renderWithProvider();
    const ctx = capturedCtx!;
    const revokespy = URL.revokeObjectURL as ReturnType<typeof vi.fn>;
    const file = new File(['data'], 'tick.mp4', { type: 'video/mp4' });

    act(() => {
      ctx.addImportedAsset('clip-tick', file, 'blob:tick-url');
      ctx.removeImportedAsset('clip-tick');
    });

    // Before first microtask: not revoked
    let revoked = revokespy.mock.calls.some(([url]) => url === 'blob:tick-url');
    expect(revoked).toBe(false);

    // After first microtask: revoked
    await Promise.resolve();
    revoked = revokespy.mock.calls.some(([url]) => url === 'blob:tick-url');
    expect(revoked).toBe(true);

    // Revoked exactly once, not twice
    const revokeCount = revokespy.mock.calls.filter(
      ([url]) => url === 'blob:tick-url',
    ).length;
    expect(revokeCount).toBe(1);
  });

  it('immediate: true revokes synchronously — safe for callers that know no draw is in progress', () => {
    renderWithProvider();
    const ctx = capturedCtx!;
    const revokespy = URL.revokeObjectURL as ReturnType<typeof vi.fn>;
    const file = new File(['data'], 'immediate.mp4', { type: 'video/mp4' });

    act(() => {
      ctx.addImportedAsset('clip-imm', file, 'blob:imm-url');
      ctx.removeImportedAsset('clip-imm', { immediate: true });
    });

    // Synchronous revocation
    const revokedSync = revokespy.mock.calls.some(([url]) => url === 'blob:imm-url');
    expect(revokedSync).toBe(true);
  });

  it('multiple concurrent assets: only the removed asset is deferred — others remain accessible', async () => {
    renderWithProvider();
    const ctx = capturedCtx!;
    const revokespy = URL.revokeObjectURL as ReturnType<typeof vi.fn>;
    const fileA = new File(['a'], 'a.mp4', { type: 'video/mp4' });
    const fileB = new File(['b'], 'b.mp4', { type: 'video/mp4' });

    act(() => {
      ctx.addImportedAsset('clip-a', fileA, 'blob:url-a');
      ctx.addImportedAsset('clip-b', fileB, 'blob:url-b');
    });

    // Remove only clip-a
    act(() => { ctx.removeImportedAsset('clip-a'); });

    // clip-b must still be accessible (its URL not affected by clip-a's removal)
    expect(ctx.getBlobUrl('clip-b')).toBe('blob:url-b');
    expect(ctx.getBlobUrl('clip-a')).toBeUndefined();

    // Neither URL has been revoked yet synchronously
    expect(revokespy.mock.calls.some(([url]) => url === 'blob:url-a')).toBe(false);
    expect(revokespy.mock.calls.some(([url]) => url === 'blob:url-b')).toBe(false);

    // After microtask: clip-a's URL revoked, clip-b's URL still live
    await Promise.resolve();
    expect(revokespy.mock.calls.some(([url]) => url === 'blob:url-a')).toBe(true);
    expect(revokespy.mock.calls.some(([url]) => url === 'blob:url-b')).toBe(false);
  });
});
