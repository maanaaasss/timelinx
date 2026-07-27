/**
 * Media Import Utilities — Phase 10
 *
 * Extracts real metadata from user-selected files using hidden
 * <video>, <audio>, and <Image> elements. No WebCodecs dependency.
 */

const METADATA_TIMEOUT_MS = 10_000;
const THUMBNAIL_MAX_WIDTH = 320;
const THUMBNAIL_QUALITY = 0.6;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImportedMediaType = 'video' | 'audio' | 'image';

export interface VideoMetadata {
  readonly kind: 'video';
  readonly duration: number; // seconds
  readonly width: number;
  readonly height: number;
  readonly thumbnail: string; // data URL (JPEG)
}

export interface AudioMetadata {
  readonly kind: 'audio';
  readonly duration: number; // seconds
}

export interface ImageMetadata {
  readonly kind: 'image';
  readonly width: number;
  readonly height: number;
  readonly thumbnail: string; // data URL (JPEG)
}

export type MediaMetadata = VideoMetadata | AudioMetadata | ImageMetadata;

export interface ImportError {
  readonly fileName: string;
  readonly message: string;
}

// ---------------------------------------------------------------------------
// Type detection
// ---------------------------------------------------------------------------

export function detectMediaType(file: File): ImportedMediaType | 'unsupported' {
  const t = file.type;
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('audio/')) return 'audio';
  if (t.startsWith('image/')) return 'image';
  return 'unsupported';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wraps a Promise with a timeout.
 *
 * - If the timeout fires first: the outer Promise rejects immediately, AND
 *   `onTimeout` is called so the inner work can be aborted and any blob URLs
 *   or other resources can be revoked. Without `onTimeout`, a timed-out
 *   import would leak its blob URL permanently (C1 fix).
 * - If the inner Promise settles first: the timer is cancelled, `onTimeout`
 *   is never called, and the result propagates normally.
 */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
  onTimeout?: () => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout?.();
      reject(new Error(`Timeout reading ${label}`));
    }, ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

function revoke(url: string): void {
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Video metadata extraction
// ---------------------------------------------------------------------------

export function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;

  // cleanup aborts the element and revokes the blob URL.
  // It is idempotent — safe to call from both the timeout handler and
  // the inner Promise's event handlers.
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    video.removeAttribute('src');
    video.load();
    revoke(url);
  };

  const inner = new Promise<VideoMetadata>((resolve, reject) => {
    video.addEventListener('error', () => {
      cleanup();
      reject(new Error(`Cannot read video: ${file.name}`));
    });

    video.addEventListener('loadedmetadata', () => {
      const duration = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;

      if (!isFinite(duration) || duration <= 0) {
        cleanup();
        reject(new Error(`Video has zero or invalid duration: ${file.name}`));
        return;
      }

      // Validate dimensions — audio-only containers report 0×0
      if (width <= 0 || height <= 0) {
        cleanup();
        reject(new Error(`Video has no video track (zero dimensions): ${file.name}`));
        return;
      }

      const seekTime = duration * 0.1;

      video.addEventListener('seeked', () => {
        try {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, THUMBNAIL_MAX_WIDTH / width);
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            cleanup();
            reject(new Error('Failed to create canvas context'));
            return;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL('image/jpeg', THUMBNAIL_QUALITY);
          cleanup();
          resolve({ kind: 'video', duration, width, height, thumbnail });
        } catch (err) {
          cleanup();
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }, { once: true });

      video.currentTime = seekTime;
    });

    video.src = url;
  });

  // Pass `cleanup` as the onTimeout handler — this ensures the blob URL is
  // revoked and the <video> element is aborted even if loadedmetadata never
  // fires within the timeout window (T0-1 fix, T1-3 fix).
  return withTimeout(inner, METADATA_TIMEOUT_MS, file.name, cleanup);
}

// ---------------------------------------------------------------------------
// Audio metadata extraction
// ---------------------------------------------------------------------------

export function extractAudioMetadata(file: File): Promise<AudioMetadata> {
  const url = URL.createObjectURL(file);
  const audio = document.createElement('audio');
  audio.preload = 'metadata';

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    audio.removeAttribute('src');
    audio.load();
    revoke(url);
  };

  const inner = new Promise<AudioMetadata>((resolve, reject) => {
    audio.addEventListener('error', () => {
      cleanup();
      reject(new Error(`Cannot read audio: ${file.name}`));
    });

    audio.addEventListener('loadedmetadata', () => {
      const duration = audio.duration;
      if (!isFinite(duration) || duration <= 0) {
        cleanup();
        reject(new Error(`Audio has zero or invalid duration: ${file.name}`));
        return;
      }
      cleanup();
      resolve({ kind: 'audio', duration });
    });

    audio.src = url;
  });

  return withTimeout(inner, METADATA_TIMEOUT_MS, file.name, cleanup);
}

// ---------------------------------------------------------------------------
// Image metadata extraction
// ---------------------------------------------------------------------------

export function extractImageMetadata(file: File): Promise<ImageMetadata> {
  const url = URL.createObjectURL(file);
  const img = new Image();

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    img.src = '';
    revoke(url);
  };

  const inner = new Promise<ImageMetadata>((resolve, reject) => {
    img.addEventListener('error', () => {
      cleanup();
      reject(new Error(`Cannot read image: ${file.name}`));
    });

    img.addEventListener('load', () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, THUMBNAIL_MAX_WIDTH / Math.max(width, 1));
        canvas.width = Math.round(Math.max(width, 1) * scale);
        canvas.height = Math.round(Math.max(height, 1) * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          reject(new Error('Failed to create canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg', THUMBNAIL_QUALITY);
        cleanup();
        resolve({ kind: 'image', width, height, thumbnail });
      } catch (err) {
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });

    img.src = url;
  });

  return withTimeout(inner, METADATA_TIMEOUT_MS, file.name, cleanup);
}

// ---------------------------------------------------------------------------
// Unified extractor
// ---------------------------------------------------------------------------

export async function extractMetadata(file: File): Promise<MediaMetadata> {
  const type = detectMediaType(file);
  switch (type) {
    case 'video': return extractVideoMetadata(file);
    case 'audio': return extractAudioMetadata(file);
    case 'image': return extractImageMetadata(file);
    default:
      throw new Error(`Unsupported file type: ${file.type || 'unknown'} (${file.name})`);
  }
}
