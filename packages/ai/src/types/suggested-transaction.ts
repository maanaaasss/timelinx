/**
 * SuggestedTransaction types for AI operation layer.
 *
 * A SuggestedTransaction is a Transaction proposed by an AI adapter
 * that can be previewed, applied, or rejected by the user.
 */

import type { Transaction, TimelineFrame } from '@timelinx/core';

// ---------------------------------------------------------------------------
// SuggestedTransaction
// ---------------------------------------------------------------------------

/**
 * Confidence level for an AI suggestion.
 */
export type ConfidenceLevel = 'low' | 'medium' | 'high';

/**
 * Category of AI suggestion.
 */
export type SuggestionCategory =
  | 'transcript'
  | 'caption'
  | 'silence'
  | 'scene'
  | 'command'
  | 'effect'
  | 'trim'
  | 'arrange';

/**
 * A transaction suggested by an AI adapter.
 * Includes metadata for preview and user decision.
 */
export type SuggestedTransaction = {
  /** Unique identifier for this suggestion. */
  readonly id: string;
  /** Human-readable label for the suggestion. */
  readonly label: string;
  /** Category of suggestion. */
  readonly category: SuggestionCategory;
  /** AI confidence level. */
  readonly confidence: ConfidenceLevel;
  /** The actual transaction to apply. */
  readonly transaction: Transaction;
  /** Optional description of what this does. */
  readonly description?: string;
  /** Optional preview data (e.g., transcript text, detected scenes). */
  readonly preview?: SuggestionPreview;
  /** Timestamp when this was generated. */
  readonly generatedAt: number;
  /** Source adapter that generated this. */
  readonly source: string;
};

/**
 * Preview data for a suggestion.
 */
export type SuggestionPreview =
  | TranscriptPreview
  | CaptionPreview
  | SilencePreview
  | ScenePreview
  | CommandPreview;

/**
 * Preview for transcript suggestions.
 */
export type TranscriptPreview = {
  type: 'transcript';
  /** The generated transcript text. */
  text: string;
  /** Language detected. */
  language?: string;
  /** Word-level timestamps if available. */
  words?: Array<{
    text: string;
    startFrame: TimelineFrame;
    endFrame: TimelineFrame;
    confidence: number;
  }>;
};

/**
 * Preview for caption suggestions.
 */
export type CaptionPreview = {
  type: 'caption';
  /** The generated caption text. */
  text: string;
  /** Start frame. */
  startFrame: TimelineFrame;
  /** End frame. */
  endFrame: TimelineFrame;
  /** Style name if specified. */
  style?: string;
};

/**
 * Preview for silence detection suggestions.
 */
export type SilencePreview = {
  type: 'silence';
  /** Detected silence regions. */
  regions: Array<{
    startFrame: TimelineFrame;
    endFrame: TimelineFrame;
    amplitude: number;
  }>;
  /** Total silence duration in frames. */
  totalFrames: number;
};

/**
 * Preview for scene detection suggestions.
 */
export type ScenePreview = {
  type: 'scene';
  /** Detected scene changes. */
  scenes: Array<{
    frame: TimelineFrame;
    confidence: number;
    description?: string;
  }>;
};

/**
 * Preview for natural language command suggestions.
 */
export type CommandPreview = {
  type: 'command';
  /** The parsed intent. */
  intent: string;
  /** Extracted parameters. */
  params: Record<string, unknown>;
  /** Original natural language input. */
  input: string;
};

// ---------------------------------------------------------------------------
// Suggestion State
// ---------------------------------------------------------------------------

/**
 * State of a suggestion in the review workflow.
 */
export type SuggestionState = 'pending' | 'approved' | 'rejected' | 'applied';

/**
 * A suggestion with its current state in the review workflow.
 */
export type SuggestionWithState = {
  /** The suggestion. */
  readonly suggestion: SuggestedTransaction;
  /** Current state. */
  state: SuggestionState;
  /** Timestamp when state was last updated. */
  updatedAt: number;
  /** Optional user notes. */
  notes?: string;
};

// ---------------------------------------------------------------------------
// Suggestion Manager
// ---------------------------------------------------------------------------

/**
 * Manager for handling AI suggestions workflow.
 */
export interface ISuggestionManager {
  /** Add a new suggestion. */
  addSuggestion(suggestion: SuggestedTransaction): void;
  /** Get all pending suggestions. */
  getPendingSuggestions(): SuggestionWithState[];
  /** Get all suggestions. */
  getAllSuggestions(): SuggestionWithState[];
  /** Approve a suggestion. */
  approveSuggestion(id: string): void;
  /** Reject a suggestion. */
  rejectSuggestion(id: string, reason?: string): void;
  /** Apply an approved suggestion. Returns the transaction. */
  applySuggestion(id: string): Transaction | null;
  /** Clear all suggestions. */
  clear(): void;
}
