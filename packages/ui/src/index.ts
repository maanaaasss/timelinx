/**
 * @webpacked-timeline/ui — Public API
 *
 * Timeline editor components with multiple preset themes.
 *
 * Quick start (Studio preset):
 *   import { StudioEditor } from '@webpacked-timeline/ui';
 *   import '@webpacked-timeline/ui/styles/studio';
 *
 *   <StudioEditor engine={engine} style={{ height: '100vh' }} />
 *
 * Quick start (DaVinci preset):
 *   import { DaVinciEditor } from '@webpacked-timeline/ui';
 *   import '@webpacked-timeline/ui/styles/davinci';
 *
 *   <DaVinciEditor engine={engine} style={{ height: '100vh' }} />
 */

// ── Studio Preset (clean, professional dark theme) ─────────────────────────
export {
  StudioEditor,
  StudioToolbar,
  StudioRuler,
  StudioTrack,
  StudioClip,
  StudioPlayhead,
} from './presets/studio';
export type {
  StudioEditorProps,
  StudioRulerProps,
  StudioTrackProps,
  StudioClipProps,
  StudioPlayheadProps,
} from './presets/studio';

// ── DaVinci Preset (classic DaVinci Resolve style) ─────────────────────────
export {
  DaVinciEditor,
  DaVinciToolbar,
  DaVinciRuler,
  DaVinciTrack,
  DaVinciClip,
  DaVinciPlayhead,
} from './presets/davinci';
export type {
  DaVinciEditorProps,
  DaVinciRulerProps,
  DaVinciTrackProps,
  DaVinciClipProps,
  DaVinciPlayheadProps,
} from './presets/davinci';

// ── Context (for custom layouts) ───────────────────────────────────────────
export {
  TimelineProvider,
  useTimelineContext,
  useEngine,
} from './context/timeline-context';
export type {
  TimelineContextValue,
  TimelineProviderProps,
} from './context/timeline-context';

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
