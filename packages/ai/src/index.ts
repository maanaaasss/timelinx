/**
 * @timelinx/ai - AI Operation Layer for Timelinx
 *
 * Provides suggested transactions, transcript generation,
 * scene detection, and natural language command parsing.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type {
  // Suggested Transaction
  SuggestedTransaction,
  SuggestionCategory,
  ConfidenceLevel,
  SuggestionPreview,
  TranscriptPreview,
  CaptionPreview,
  SilencePreview,
  ScenePreview,
  CommandPreview,
  SuggestionState,
  SuggestionWithState,
  ISuggestionManager,
  // Adapters
  AIAdapter,
  TranscriptAdapter,
  TranscriptInput,
  TranscriptOutput,
  CaptionAdapter,
  CaptionInput,
  SceneDetectionAdapter,
  SceneDetectionInput,
  DetectedScene,
  SilenceDetectionAdapter,
  SilenceDetectionInput,
  DetectedSilence,
  NLUAdapter,
  NLUInput,
  ParsedIntent,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export {
  SuggestionManager,
  createSuggestionManager,
} from './helpers/suggestion-manager';

export {
  generateSilenceDeleteSuggestions,
  detectSilence,
} from './helpers/silence-delete';

export {
  generateSceneMarkerSuggestions,
  detectSceneChanges,
  createSceneMarker,
} from './helpers/scene-detection';

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------
export {
  DemoTranscriptAdapter,
  createDemoTranscriptAdapter,
} from './adapters/demo-transcript';

export {
  DemoNLUAdapter,
  createDemoNLUAdapter,
} from './adapters/demo-nlu';
