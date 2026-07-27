/**
 * Tests for media-import.ts
 *
 * Focus: blob URL revocation in ALL paths, including the timeout path (C1 fix).
 * Tests run in jsdom so we can create File objects and spy on URL APIs.
 *
 * jsdom does not implement HTMLMediaElement network/decode behaviour, so we
 * cannot rely on media events firing automatically. Instead, we:
 *   1. Spy on document.createElement to capture media elements as they are created.
 *   2. Manually fire events on the captured element to simulate browser behaviour.
 *   3. Assert that URL.revokeObjectURL is called in each path.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectMediaType,
  extractVideoMetadata,
  extractAudioMetadata,
  extractImageMetadata,
  extractMetadata,
} from '../utils/media-import';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(name: string, type: string, content = 'x'): File {
  return new File([content], name, { type });
}

// Captures the next media element created via document.createElement
function captureNextElement<T extends HTMLElement>(tagName: string): {
  getElement: () => T | null;
  restore: () => void;
} {
  let captured: T | null = null;
  const original = document.createElement.bind(document);
  const spy = vi.spyOn(document, 'createElement').mockImplementation((tag: string, ...rest) => {
    const el = original(tag, ...(rest as [ElementCreationOptions?]));
    if (tag === tagName && !captured) {
      captured = el as unknown as T;
    }
    return el;
  });
  return {
    getElement: () => captured,
    restore: () => spy.mockRestore(),
  };
}

// ---------------------------------------------------------------------------
// detectMediaType
// ---------------------------------------------------------------------------

describe('detectMediaType', () => {
  it('identifies video MIME types', () => {
    expect(detectMediaType(makeFile('a.mp4', 'video/mp4'))).toBe('video');
    expect(detectMediaType(makeFile('a.webm', 'video/webm'))).toBe('video');
  });

  it('identifies audio MIME types', () => {
    expect(detectMediaType(makeFile('a.mp3', 'audio/mpeg'))).toBe('audio');
    expect(detectMediaType(makeFile('a.wav', 'audio/wav'))).toBe('audio');
  });

  it('identifies image MIME types', () => {
    expect(detectMediaType(makeFile('a.png', 'image/png'))).toBe('image');
    expect(detectMediaType(makeFile('a.jpg', 'image/jpeg'))).toBe('image');
    expect(detectMediaType(makeFile('a.webp', 'image/webp'))).toBe('image');
  });

  it('returns unsupported for unknown MIME types', () => {
    expect(detectMediaType(makeFile('a.doc', 'application/msword'))).toBe('unsupported');
    expect(detectMediaType(makeFile('a', ''))).toBe('unsupported');
  });
});

// ---------------------------------------------------------------------------
// extractMetadata — unsupported file type
// ---------------------------------------------------------------------------

describe('extractMetadata', () => {
  it('throws for unsupported file type', async () => {
    const file = makeFile('a.doc', 'application/msword');
    await expect(extractMetadata(file)).rejects.toThrow('Unsupported file type');
  });
});

// ---------------------------------------------------------------------------
// extractVideoMetadata
// ---------------------------------------------------------------------------

describe('extractVideoMetadata', () => {
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-video-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('rejects and REVOKES blob URL when video fires onerror', async () => {
    const file = makeFile('bad.mp4', 'video/mp4');
    const { getElement, restore } = captureNextElement<HTMLVideoElement>('video');

    const promise = extractVideoMetadata(file);
    restore();

    const video = getElement();
    expect(video).not.toBeNull();
    video!.dispatchEvent(new Event('error'));

    await expect(promise).rejects.toThrow('Cannot read video: bad.mp4');
    // blob URL must be revoked — this is the C1 fix verification
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-video-url');
  });

  it('rejects and REVOKES blob URL when video has invalid duration', async () => {
    const file = makeFile('bad-dur.mp4', 'video/mp4');
    const { getElement, restore } = captureNextElement<HTMLVideoElement>('video');

    const promise = extractVideoMetadata(file);
    restore();

    const video = getElement()!;
    Object.defineProperty(video, 'duration', { value: Infinity, configurable: true });
    Object.defineProperty(video, 'videoWidth', { value: 1920, configurable: true });
    Object.defineProperty(video, 'videoHeight', { value: 1080, configurable: true });
    video.dispatchEvent(new Event('loadedmetadata'));

    await expect(promise).rejects.toThrow('zero or invalid duration');
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-video-url');
  });

  it('rejects and REVOKES blob URL when video has zero dimensions (audio-only container)', async () => {
    const file = makeFile('audio-only.mp4', 'video/mp4');
    const { getElement, restore } = captureNextElement<HTMLVideoElement>('video');

    const promise = extractVideoMetadata(file);
    restore();

    const video = getElement()!;
    Object.defineProperty(video, 'duration', { value: 5.0, configurable: true });
    Object.defineProperty(video, 'videoWidth', { value: 0, configurable: true });
    Object.defineProperty(video, 'videoHeight', { value: 0, configurable: true });
    video.dispatchEvent(new Event('loadedmetadata'));

    await expect(promise).rejects.toThrow('no video track');
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-video-url');
  });

  it('REVOKES blob URL on timeout — the C1 fix', async () => {
    vi.useFakeTimers();
    const file = makeFile('slow.mp4', 'video/mp4');
    const promise = extractVideoMetadata(file);

    // Advance past the 10-second timeout without firing any media events
    vi.advanceTimersByTime(11_000);

    await expect(promise).rejects.toThrow('Timeout reading slow.mp4');
    // The key assertion: blob URL must be revoked even on timeout
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-video-url');
  });
});

// ---------------------------------------------------------------------------
// extractAudioMetadata
// ---------------------------------------------------------------------------

describe('extractAudioMetadata', () => {
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-audio-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('rejects and REVOKES blob URL on audio onerror', async () => {
    const file = makeFile('bad.mp3', 'audio/mpeg');
    const { getElement, restore } = captureNextElement<HTMLAudioElement>('audio');

    const promise = extractAudioMetadata(file);
    restore();

    const audio = getElement()!;
    audio.dispatchEvent(new Event('error'));

    await expect(promise).rejects.toThrow('Cannot read audio: bad.mp3');
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-audio-url');
  });

  it('rejects and REVOKES blob URL on Infinity duration', async () => {
    const file = makeFile('inf.mp3', 'audio/mpeg');
    const { getElement, restore } = captureNextElement<HTMLAudioElement>('audio');

    const promise = extractAudioMetadata(file);
    restore();

    const audio = getElement()!;
    Object.defineProperty(audio, 'duration', { value: Infinity, configurable: true });
    audio.dispatchEvent(new Event('loadedmetadata'));

    await expect(promise).rejects.toThrow('zero or invalid duration');
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-audio-url');
  });

  it('REVOKES blob URL on timeout — the C1 fix', async () => {
    vi.useFakeTimers();
    const file = makeFile('slow.mp3', 'audio/mpeg');
    const promise = extractAudioMetadata(file);

    vi.advanceTimersByTime(11_000);

    await expect(promise).rejects.toThrow('Timeout reading slow.mp3');
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-audio-url');
  });
});

// ---------------------------------------------------------------------------
// extractImageMetadata
// ---------------------------------------------------------------------------

describe('extractImageMetadata', () => {
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let OriginalImage: typeof Image;

  beforeEach(() => {
    OriginalImage = globalThis.Image;
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-image-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.Image = OriginalImage;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('rejects and REVOKES blob URL on image onerror', async () => {
    let capturedImg: HTMLImageElement | null = null;

    // Intercept Image construction to capture the instance
    const OrigImage = globalThis.Image;
    globalThis.Image = class extends OrigImage {
      constructor() {
        super();
        capturedImg = this as unknown as HTMLImageElement;
      }
    } as typeof Image;

    const file = makeFile('bad.png', 'image/png');
    const promise = extractImageMetadata(file);

    expect(capturedImg).not.toBeNull();
    capturedImg!.dispatchEvent(new Event('error'));

    await expect(promise).rejects.toThrow('Cannot read image: bad.png');
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-image-url');
  });

  it('REVOKES blob URL on timeout — the C1 fix', async () => {
    vi.useFakeTimers();
    const file = makeFile('huge.jpg', 'image/jpeg');
    const promise = extractImageMetadata(file);

    vi.advanceTimersByTime(11_000);

    await expect(promise).rejects.toThrow('Timeout reading huge.jpg');
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-image-url');
  });
});

// ---------------------------------------------------------------------------
// Idempotent cleanup — calling cleanup twice (late event after timeout)
// must not double-revoke
// ---------------------------------------------------------------------------

describe('withTimeout idempotency (via extractAudioMetadata)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('does not revoke twice if the event fires after timeout', async () => {
    vi.useFakeTimers();
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:late-url');

    let capturedAudio: HTMLAudioElement | null = null;
    const { getElement, restore } = captureNextElement<HTMLAudioElement>('audio');

    const file = makeFile('late.mp3', 'audio/mpeg');
    const promise = extractAudioMetadata(file);
    restore();
    capturedAudio = getElement();

    // Advance past timeout — promise rejects, cleanup() runs (revoke #1)
    vi.advanceTimersByTime(11_000);
    await expect(promise).rejects.toThrow('Timeout');

    // Now fire loadedmetadata late — cleanup() should be idempotent (no second revoke)
    if (capturedAudio) {
      Object.defineProperty(capturedAudio, 'duration', { value: 5.0, configurable: true });
      capturedAudio.dispatchEvent(new Event('loadedmetadata'));
    }

    // Wait a tick for any late handlers
    vi.useRealTimers();
    await new Promise((r) => setTimeout(r, 10));

    // revokeObjectURL should have been called exactly once (on timeout)
    const revokeCalls = revokeObjectURLSpy.mock.calls.filter(
      ([url]) => url === 'blob:late-url',
    );
    expect(revokeCalls.length).toBe(1);
  });
});
