/**
 * @webpacked-timeline/ui — Public API
 *
 * Core structural timeline components.
 */

// ── Base Timeline Components ───────────────────────────────────────────────
export { TimelineEditor } from './components/timeline-editor';
export type { TimelineEditorProps } from './components/timeline-editor';

export { TimelineToolbar } from './components/timeline-toolbar';

export { TimelineRuler } from './components/timeline-ruler';
export type { TimelineRulerProps } from './components/timeline-ruler';

export { TimelineTrack } from './components/timeline-track';
export type { TimelineTrackProps } from './components/timeline-track';

export { TimelineClip } from './components/timeline-clip';
export type { TimelineClipProps } from './components/timeline-clip';

export { TimelinePlayhead } from './components/timeline-playhead';
export type { TimelinePlayheadProps } from './components/timeline-playhead';

// ── Context (for custom layouts) ───────────────────────────────────────────
export {
  TimelineProvider,
  useTimelineContext,
  useEngine,
  TimelineCtx,
} from './context/timeline-context';

export type {
  TimelineContextValue,
  TimelineProviderProps,
} from './context/timeline-context';

// ── Icons (for custom toolbars) ────────────────────────────────────────────
export {
  IconPlus,
  IconFilm,
  IconHeadphones,
  IconZoomIn,
  IconZoomOut,
  IconUndo,
  IconRedo,
  IconPlayerPlay,
  IconPlayerPause,
  IconCursor,
  IconRazor,
  IconHand,
  IconTrim,
  IconRoll,
  IconSlip,
  IconSlide,
  TOOL_ICONS,
} from './components/icons';

// ── Shared utilities ───────────────────────────────────────────────────────
export {
  frameToPx,
  pxToFrame,
  frameToTimecode,
  rulerTickInterval,
} from './shared/time';

export { useTimelineRefs } from './shared/use-refs';
export { clamp } from './shared/geometry';
export { cn } from './shared/cn';
