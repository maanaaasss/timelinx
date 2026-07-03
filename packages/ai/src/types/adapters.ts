/**
 * AI Adapter types for Timelinx.
 *
 * Adapters are interfaces for integrating AI services
 * for transcript generation, caption generation, scene detection, etc.
 */

import type { TimelineFrame, AssetId, ClipId, TrackId } from '@timelinx/core';
import type { SuggestedTransaction } from './suggested-transaction';

// ---------------------------------------------------------------------------
// Base Adapter
// ---------------------------------------------------------------------------

/**
 * Base interface for all AI adapters.
 */
export interface AIAdapter {
  /** Unique adapter identifier. */
  readonly id: string;
  /** Human-readable name. */
  readonly name: string;
  /** Adapter version. */
  readonly version: string;
  /** Check if adapter is available in this environment. */
  isAvailable(): boolean;
}

// ---------------------------------------------------------------------------
// Transcript Adapter
// ---------------------------------------------------------------------------

/**
 * Input for transcript generation.
 */
export type TranscriptInput = {
  /** Asset ID containing audio. */
  assetId: AssetId;
  /** Optional clip ID if processing a specific clip. */
  clipId?: ClipId;
  /** Start frame for processing. */
  startFrame?: TimelineFrame;
  /** End frame for processing. */
  endFrame?: TimelineFrame;
  /** Language code (e.g., 'en', 'es'). Default: auto-detect. */
  language?: string;
  /** Enable word-level timestamps. Default: true. */
  wordTimestamps?: boolean;
};

/**
 * Output from transcript generation.
 */
export type TranscriptOutput = {
  /** Generated transcript text. */
  text: string;
  /** Detected language. */
  language: string;
  /** Word-level timestamps if requested. */
  words?: Array<{
    text: string;
    startFrame: TimelineFrame;
    endFrame: TimelineFrame;
    confidence: number;
  }>;
  /** Overall confidence. */
  confidence: number;
};

/**
 * Adapter for generating transcripts from audio.
 */
export interface TranscriptAdapter extends AIAdapter {
  /** Generate transcript from audio. */
  generateTranscript(input: TranscriptInput): Promise<TranscriptOutput>;
  /** Generate suggested transactions for adding transcript as captions. */
  generateCaptionSuggestions(
    input: TranscriptInput,
    trackId: TrackId,
  ): Promise<SuggestedTransaction[]>;
}

// ---------------------------------------------------------------------------
// Caption Adapter
// ---------------------------------------------------------------------------

/**
 * Input for caption generation.
 */
export type CaptionInput = {
  /** Text to convert to captions. */
  text: string;
  /** Start frame. */
  startFrame: TimelineFrame;
  /** End frame. */
  endFrame: TimelineFrame;
  /** Maximum characters per line. Default: 42. */
  maxCharsPerLine?: number;
  /** Maximum lines. Default: 2. */
  maxLines?: number;
  /** Style name to apply. */
  style?: string;
};

/**
 * Adapter for generating captions from text.
 */
export interface CaptionAdapter extends AIAdapter {
  /** Generate captions from text. */
  generateCaptions(input: CaptionInput): Promise<SuggestedTransaction[]>;
  /** Auto-generate captions from audio. */
  autoCaption(
    assetId: AssetId,
    trackId: string,
    options?: {
      language?: string;
      maxCharsPerLine?: number;
      style?: string;
    },
  ): Promise<SuggestedTransaction[]>;
}

// ---------------------------------------------------------------------------
// Scene Detection Adapter
// ---------------------------------------------------------------------------

/**
 * Input for scene detection.
 */
export type SceneDetectionInput = {
  /** Asset ID containing video. */
  assetId: AssetId;
  /** Optional clip ID. */
  clipId?: ClipId;
  /** Start frame. */
  startFrame?: TimelineFrame;
  /** End frame. */
  endFrame?: TimelineFrame;
  /** Sensitivity threshold (0-1). Default: 0.3. */
  threshold?: number;
  /** Minimum frames between scenes. Default: 10. */
  minSceneLength?: number;
};

/**
 * Detected scene.
 */
export type DetectedScene = {
  /** Frame where scene change occurs. */
  frame: TimelineFrame;
  /** Confidence of detection. */
  confidence: number;
  /** Optional description. */
  description?: string;
};

/**
 * Adapter for detecting scene changes in video.
 */
export interface SceneDetectionAdapter extends AIAdapter {
  /** Detect scenes in video. */
  detectScenes(input: SceneDetectionInput): Promise<DetectedScene[]>;
  /** Generate marker suggestions for scene changes. */
  generateSceneMarkers(
    input: SceneDetectionInput,
  ): Promise<SuggestedTransaction[]>;
}

// ---------------------------------------------------------------------------
// Silence Detection Adapter
// ---------------------------------------------------------------------------

/**
 * Input for silence detection.
 */
export type SilenceDetectionInput = {
  /** Asset ID containing audio. */
  assetId: AssetId;
  /** Optional clip ID. */
  clipId?: ClipId;
  /** Start frame. */
  startFrame?: TimelineFrame;
  /** End frame. */
  endFrame?: TimelineFrame;
  /** Amplitude threshold (0-1). Default: 0.01. */
  threshold?: number;
  /** Minimum silence duration in frames. Default: 30. */
  minDuration?: number;
};

/**
 * Detected silence region.
 */
export type DetectedSilence = {
  /** Start frame of silence. */
  startFrame: TimelineFrame;
  /** End frame of silence. */
  endFrame: TimelineFrame;
  /** Average amplitude during silence. */
  amplitude: number;
};

/**
 * Adapter for detecting silence in audio.
 */
export interface SilenceDetectionAdapter extends AIAdapter {
  /** Detect silence regions. */
  detectSilence(input: SilenceDetectionInput): Promise<DetectedSilence[]>;
  /** Generate ripple delete suggestions for silence. */
  generateSilenceDeleteSuggestions(
    input: SilenceDetectionInput,
  ): Promise<SuggestedTransaction[]>;
}

// ---------------------------------------------------------------------------
// Natural Language Command Adapter
// ---------------------------------------------------------------------------

/**
 * Input for natural language command parsing.
 */
export type NLUInput = {
  /** Natural language command. */
  command: string;
  /** Current timeline context (optional). */
  context?: {
    selectedClipIds?: ClipId[];
    currentFrame?: TimelineFrame;
    fps?: number;
  };
};

/**
 * Parsed intent from natural language.
 */
export type ParsedIntent = {
  /** Intent name (e.g., 'delete', 'trim', 'move', 'add_caption'). */
  intent: string;
  /** Extracted parameters. */
  params: Record<string, unknown>;
  /** Confidence in parsing. */
  confidence: number;
  /** Human-readable description of what will happen. */
  description: string;
};

/**
 * Adapter for parsing natural language commands.
 */
export interface NLUAdapter extends AIAdapter {
  /** Parse natural language command into intent. */
  parseCommand(input: NLUInput): Promise<ParsedIntent>;
  /** Generate suggested transactions from natural language. */
  generateSuggestions(input: NLUInput): Promise<SuggestedTransaction[]>;
}
