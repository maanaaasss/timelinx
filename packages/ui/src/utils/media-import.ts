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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout reading ${label}`)), ms);
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
  return withTimeout(
    new Promise<VideoMetadata>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        video.removeAttribute('src');
        video.load();
        revoke(url);
      };

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
    }),
    METADATA_TIMEOUT_MS,
    file.name,
  );
}

// ---------------------------------------------------------------------------
// Audio metadata extraction
// ---------------------------------------------------------------------------

export function extractAudioMetadata(file: File): Promise<AudioMetadata> {
  return withTimeout(
    new Promise<AudioMetadata>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const audio = document.createElement('audio');
      audio.preload = 'metadata';

      const cleanup = () => {
        audio.removeAttribute('src');
        audio.load();
        revoke(url);
      };

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
    }),
    METADATA_TIMEOUT_MS,
    file.name,
  );
}

// ---------------------------------------------------------------------------
// Image metadata extraction
// ---------------------------------------------------------------------------

export function extractImageMetadata(file: File): Promise<ImageMetadata> {
  return withTimeout(
    new Promise<ImageMetadata>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();

      img.addEventListener('error', () => {
        revoke(url);
        reject(new Error(`Cannot read image: ${file.name}`));
      });

      img.addEventListener('load', () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        try {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, THUMBNAIL_MAX_WIDTH / width);
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            revoke(url);
            reject(new Error('Failed to create canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL('image/jpeg', THUMBNAIL_QUALITY);
          revoke(url);
          resolve({ kind: 'image', width, height, thumbnail });
        } catch (err) {
          revoke(url);
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });

      img.src = url;
    }),
    METADATA_TIMEOUT_MS,
    file.name,
  );
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
