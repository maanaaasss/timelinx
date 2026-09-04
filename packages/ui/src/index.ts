/**
 * @timelinx/ui — Public API
 *
 * Core structural timeline components.
 */

// ── Legacy V1 Base Timeline Components (Deprecated) ─────────────────────────
/** @deprecated Legacy V1 TimelineEditor. Use `TimelineLayout` with `TimelineProvider` or composable V2 components instead. */
export { TimelineEditor } from './components/timeline-editor';
/** @deprecated Legacy V1 TimelineEditorProps. Use `TimelineLayoutProps` instead. */
export type { TimelineEditorProps } from './components/timeline-editor';

/** @deprecated Legacy V1 TimelineToolbar. Use `TimelineToolbarV2` instead. */
export { TimelineToolbar } from './components/timeline-toolbar';
/** @deprecated Legacy V1 TimelineToolbarProps. Use `TimelineToolbarV2Props` instead. */
export type { TimelineToolbarProps } from './components/timeline-toolbar';

/** @deprecated Legacy V1 TimelineRuler. Use `TimelineRulerV2` instead. */
export { TimelineRuler } from './components/timeline-ruler';
/** @deprecated Legacy V1 TimelineRulerProps. Use `TimelineRulerV2Props` instead. */
export type { TimelineRulerProps } from './components/timeline-ruler';

/** @deprecated Legacy V1 TimelineTrack. Use `TrackRow` / `TrackHeader` / `TrackBody` instead. */
export { TimelineTrack } from './components/timeline-track';
/** @deprecated Legacy V1 TimelineTrackProps. Use `TrackRowProps` instead. */
export type { TimelineTrackProps } from './components/timeline-track';

/** @deprecated Legacy V1 TimelineClip. Use `ClipV2` instead. */
export { TimelineClip } from './components/timeline-clip';
/** @deprecated Legacy V1 TimelineClipProps. Use `ClipV2Props` instead. */
export type { TimelineClipProps } from './components/timeline-clip';

/** @deprecated Legacy V1 TimelinePlayhead. Use `PlayheadV2` or `RulerPlayhead` instead. */
export { TimelinePlayhead } from './components/timeline-playhead';
/** @deprecated Legacy V1 TimelinePlayheadProps. Use `PlayheadV2Props` instead. */
export type { TimelinePlayheadProps } from './components/timeline-playhead';

// ── Decomposed Components ──────────────────────────────────────────────────
export { ZoomControls } from './components/zoom-controls';
export type { ZoomControlsProps } from './components/zoom-controls';

export { NumberScrubber } from './components/number-scrubber';
export type { NumberScrubberProps } from './components/number-scrubber';

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

export { MediaPreview } from './components/media-preview';
export type { MediaPreviewProps } from './components/media-preview';

export { CompositorPreview } from './components/canvas-compositor';
export type { CompositorPreviewProps } from './components/canvas-compositor';

export { PreviewOverlay } from './components/preview-overlay';
export type { PreviewOverlayProps } from './components/preview-overlay';

export { ExportDialog } from './components/export-dialog';
export type { ExportDialogProps } from './components/export-dialog';

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

export type { TimelineContextValue, TimelineProviderProps } from './context/timeline-context';

export { MediaAssetsProvider, useMediaAssets } from './context/media-assets-context';

export type { MediaAssetsContextValue } from './context/media-assets-context';

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
export { frameToPx, pxToFrame, frameToTimecode, formatMSS, frameToMSS, rulerTickInterval } from './shared/time';

export { useTimelineRefs } from './shared/use-refs';
export { clamp } from './shared/geometry';
export { cn } from './shared/cn';

export {
  extractMetadata,
  extractVideoMetadata,
  extractAudioMetadata,
  extractImageMetadata,
  detectMediaType,
} from './utils/media-import';

export type {
  MediaMetadata,
  VideoMetadata,
  AudioMetadata,
  ImageMetadata,
  ImportedMediaType,
  ImportError,
} from './utils/media-import';

// ── Export (Phase 11) ────────────────────────────────────────────────────
export { useExport } from './hooks/use-export';
export type { ExportState, ExportStatus, UseExportReturn } from './hooks/use-export';

// ── Provisional State Hooks ───────────────────────────────────────────────
export { useProvisionalValue, useProvisionalTransform } from './hooks/use-provisional-value';

// ── Timeline V2 Components (migrated from prototype) ─────────────────────
export { TimelineLayout } from './components/timeline/timeline-layout';
export type { TimelineLayoutProps } from './components/timeline/timeline-layout';

export { TimelineToolbarV2 } from './components/timeline/timeline-toolbar';
export type { TimelineToolbarV2Props, ToolId } from './components/timeline/timeline-toolbar';

export { TimelineRulerV2 } from './components/timeline/timeline-ruler';
export type { TimelineRulerV2Props } from './components/timeline/timeline-ruler';

export { TimelineTrackAreaV2 } from './components/timeline/timeline-track-area';
export type { TimelineTrackAreaV2Props } from './components/timeline/timeline-track-area';

export { TrackRow } from './components/timeline/track-row';
export type { TrackRowProps } from './components/timeline/track-row';

export { TrackHeader } from './components/timeline/track-header';
export type { TrackHeaderProps } from './components/timeline/track-header';

export { TrackBody } from './components/timeline/track-body';
export type { TrackBodyProps } from './components/timeline/track-body';

export { TrackList as TrackListV2 } from './components/timeline/track-list';
export type { TrackListProps as TrackListV2Props } from './components/timeline/track-list';

export { Clip as ClipV2 } from './components/timeline/clip';
export type { ClipProps as ClipV2Props } from './components/timeline/clip';

export { Playhead as PlayheadV2 } from './components/timeline/playhead';
export type { PlayheadProps as PlayheadV2Props } from './components/timeline/playhead';

export { RulerPlayhead } from './components/timeline/ruler-playhead';
export type { RulerPlayheadProps } from './components/timeline/ruler-playhead';

export { ZoomSlider } from './components/timeline/zoom-slider';
export type { ZoomSliderProps } from './components/timeline/zoom-slider';

// ── Timeline V2 Hooks ────────────────────────────────────────────────────
export { useTimelineKeyboard } from './hooks/use-timeline-keyboard';
export type { UseTimelineKeyboardOptions } from './hooks/use-timeline-keyboard';

// ── Timeline V3 Components (CapCut-style) ────────────────
export { TimelineToolbarV3 } from './components/timeline/timeline-toolbar-v3';
export type { TimelineToolbarV3Props, PageDefinition } from './components/timeline/timeline-toolbar-v3';

export { TimelineRulerV3 } from './components/timeline/timeline-ruler-v3';
export type { TimelineRulerV3Props } from './components/timeline/timeline-ruler-v3';

export { RulerPlayheadV3 } from './components/timeline/ruler-playhead-v3';
export type { RulerPlayheadV3Props } from './components/timeline/ruler-playhead-v3';

export { TimelineEmptyState } from './components/timeline/timeline-empty-state';
export type { TimelineEmptyStateProps } from './components/timeline/timeline-empty-state';
