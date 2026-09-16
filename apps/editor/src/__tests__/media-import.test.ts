import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectMediaType,
  extractVideoMetadata,
  extractAudioMetadata,
  extractMetadata,
} from '@timelinx/ui';

// ---------------------------------------------------------------------------
// detectMediaType — pure logic, no DOM
// ---------------------------------------------------------------------------

describe('detectMediaType', () => {
  it('classifies video MIME types', () => {
    expect(detectMediaType(new File([], 'a.mp4', { type: 'video/mp4' }))).toBe('video');
    expect(detectMediaType(new File([], 'a.webm', { type: 'video/webm' }))).toBe('video');
    expect(detectMediaType(new File([], 'a.mov', { type: 'video/quicktime' }))).toBe('video');
  });

  it('classifies audio MIME types', () => {
    expect(detectMediaType(new File([], 'a.mp3', { type: 'audio/mpeg' }))).toBe('audio');
    expect(detectMediaType(new File([], 'a.wav', { type: 'audio/wav' }))).toBe('audio');
    expect(detectMediaType(new File([], 'a.ogg', { type: 'audio/ogg' }))).toBe('audio');
  });

  it('classifies image MIME types', () => {
    expect(detectMediaType(new File([], 'a.png', { type: 'image/png' }))).toBe('image');
    expect(detectMediaType(new File([], 'a.jpg', { type: 'image/jpeg' }))).toBe('image');
    expect(detectMediaType(new File([], 'a.gif', { type: 'image/gif' }))).toBe('image');
  });

  it('returns unsupported for unknown MIME types', () => {
    expect(detectMediaType(new File([], 'a.pdf', { type: 'application/pdf' }))).toBe('unsupported');
    expect(detectMediaType(new File([], 'a.txt', { type: 'text/plain' }))).toBe('unsupported');
  });

  it('returns unsupported for empty MIME type', () => {
    expect(detectMediaType(new File([], 'noext', { type: '' }))).toBe('unsupported');
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockUrl() {
  const createObjectURL = vi.fn(() => 'blob:test-url');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
  return { createObjectURL, revokeObjectURL };
}

function makeMockVideo(): HTMLVideoElement {
  const video = new EventTarget() as HTMLVideoElement;
  Object.defineProperty(video, 'preload', { value: '', writable: true });
  Object.defineProperty(video, 'muted', { value: false, writable: true });
  Object.defineProperty(video, 'playsInline', { value: false, writable: true });
  Object.defineProperty(video, 'src', { value: '', writable: true, configurable: true });
  Object.defineProperty(video, 'load', { value: vi.fn() });
  Object.defineProperty(video, 'removeAttribute', { value: vi.fn() });
  return video;
}

function makeMockAudio(): HTMLAudioElement {
  const audio = new EventTarget() as HTMLAudioElement;
  Object.defineProperty(audio, 'preload', { value: '', writable: true });
  Object.defineProperty(audio, 'src', { value: '', writable: true, configurable: true });
  Object.defineProperty(audio, 'load', { value: vi.fn() });
  Object.defineProperty(audio, 'removeAttribute', { value: vi.fn() });
  return audio;
}

// ---------------------------------------------------------------------------
// extractVideoMetadata — needs DOM mocking
// ---------------------------------------------------------------------------

describe('extractVideoMetadata', () => {
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    originalCreateElement = document.createElement.bind(document);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('rejects when video element fires error event', async () => {
    const video = makeMockVideo();
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'video') return video;
      return originalCreateElement(tag);
    });
    mockUrl();

    const file = new File([new Uint8Array(10)], 'bad.mp4', { type: 'video/mp4' });
    const promise = extractVideoMetadata(file);

    video.dispatchEvent(new Event('error'));

    await expect(promise).rejects.toThrow('Cannot read video: bad.mp4');
  });

  it('rejects when video has zero duration', async () => {
    const video = makeMockVideo();
    Object.defineProperty(video, 'duration', { value: 0, configurable: true });
    Object.defineProperty(video, 'videoWidth', { value: 1920 });
    Object.defineProperty(video, 'videoHeight', { value: 1080 });

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'video') return video;
      return originalCreateElement(tag);
    });
    mockUrl();

    const file = new File([new Uint8Array(10)], 'zero.mp4', { type: 'video/mp4' });
    const promise = extractVideoMetadata(file);

    video.dispatchEvent(new Event('loadedmetadata'));

    await expect(promise).rejects.toThrow('zero or invalid duration');
  });

  it('rejects on timeout when metadata never loads', async () => {
    const video = makeMockVideo();
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'video') return video;
      return originalCreateElement(tag);
    });
    mockUrl();

    const file = new File([new Uint8Array(10)], 'timeout.mp4', { type: 'video/mp4' });
    const promise = extractVideoMetadata(file);

    vi.advanceTimersByTime(10_000);

    await expect(promise).rejects.toThrow('Timeout reading timeout.mp4');
  });
});

// ---------------------------------------------------------------------------
// extractAudioMetadata — needs DOM mocking
// ---------------------------------------------------------------------------

describe('extractAudioMetadata', () => {
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    originalCreateElement = document.createElement.bind(document);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('rejects when audio element fires error event', async () => {
    const audio = makeMockAudio();
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'audio') return audio;
      return originalCreateElement(tag);
    });
    mockUrl();

    const file = new File([new Uint8Array(10)], 'bad.wav', { type: 'audio/wav' });
    const promise = extractAudioMetadata(file);

    audio.dispatchEvent(new Event('error'));

    await expect(promise).rejects.toThrow('Cannot read audio: bad.wav');
  });

  it('rejects when audio has NaN duration', async () => {
    const audio = makeMockAudio();
    Object.defineProperty(audio, 'duration', { value: NaN, configurable: true });

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'audio') return audio;
      return originalCreateElement(tag);
    });
    mockUrl();

    const file = new File([new Uint8Array(10)], 'zero.wav', { type: 'audio/wav' });
    const promise = extractAudioMetadata(file);

    audio.dispatchEvent(new Event('loadedmetadata'));

    await expect(promise).rejects.toThrow('zero or invalid duration');
  });

  it('rejects on timeout when metadata never loads', async () => {
    const audio = makeMockAudio();
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'audio') return audio;
      return originalCreateElement(tag);
    });
    mockUrl();

    const file = new File([new Uint8Array(10)], 'timeout.wav', { type: 'audio/wav' });
    const promise = extractAudioMetadata(file);

    vi.advanceTimersByTime(10_000);

    await expect(promise).rejects.toThrow('Timeout reading timeout.wav');
  });
});

// ---------------------------------------------------------------------------
// extractMetadata (unified) — unsupported file type
// ---------------------------------------------------------------------------

describe('extractMetadata', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects unsupported file types with clear message', async () => {
    const file = new File([], 'report.pdf', { type: 'application/pdf' });
    await expect(extractMetadata(file)).rejects.toThrow('Unsupported file type');
    await expect(extractMetadata(file)).rejects.toThrow('report.pdf');
  });

  it('rejects files with empty MIME type', async () => {
    const file = new File([], 'mystery', { type: '' });
    await expect(extractMetadata(file)).rejects.toThrow('Unsupported file type');
  });
});
