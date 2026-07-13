/**
 * @timelinx/ui — Public API
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

// ── Decomposed Components ──────────────────────────────────────────────────
export { ZoomControls } from './components/zoom-controls';
export type { ZoomControlsProps } from './components/zoom-controls';

export { TrackList } from './components/track-list';
export type { TrackListProps } from './components/track-list';

export { SnapIndicator } from './components/snap-indicator';
export type { SnapIndicatorProps } from './components/snap-indicator';

export { DropZone } from './components/drop-zone';
export type { DropZoneProps } from './components/drop-zone';

// ── Panel Components ───────────────────────────────────────────────────────
export { AssetBin } from './components/asset-bin';
export type { AssetBinProps } from './components/asset-bin';

export { Sidebar } from './components/sidebar';
export type { SidebarProps } from './components/sidebar';

export { TopNav } from './components/top-nav';
export type { TopNavProps } from './components/top-nav';

export { TransportControls } from './components/transport-controls';
export type { TransportControlsProps } from './components/transport-controls';

export { MarkersPanel } from './components/markers-panel';
export type { MarkersPanelProps } from './components/markers-panel';

export { CaptionsPanel } from './components/captions-panel';
export type { CaptionsPanelProps } from './components/captions-panel';

export { TransitionsPanel } from './components/transitions-panel';
export type { TransitionsPanelProps } from './components/transitions-panel';

export { KeyframesPanel } from './components/keyframes-panel';
export type { KeyframesPanelProps } from './components/keyframes-panel';

export { InspectorPanel } from './components/inspector-panel';
export type { InspectorPanelProps } from './components/inspector-panel';

export { EffectsPanel } from './components/effects-panel';
export type { EffectsPanelProps } from './components/effects-panel';

export { KeyboardShortcutsOverlay } from './components/keyboard-shortcuts-overlay';
export type { KeyboardShortcutsOverlayProps } from './components/keyboard-shortcuts-overlay';

export { CommandPalette } from './components/command-palette';
export type { CommandPaletteProps } from './components/command-palette';

export { StatusBar } from './components/status-bar';
export type { StatusBarProps } from './components/status-bar';

export { TabbedPanel } from './components/tabbed-panel';
export type { TabbedPanelProps, TabDefinition } from './components/tabbed-panel';

export { TextPanel } from './components/text-panel';
export type { TextPanelProps } from './components/text-panel';

export { CollapsibleSection } from './components/collapsible-section';
export type { CollapsibleSectionProps } from './components/collapsible-section';

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
  IconSnap,
  IconEye,
  IconEyeOff,
  IconLock,
  IconUnlock,
  IconVolume,
  IconVolumeOff,
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
