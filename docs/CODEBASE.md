# Timelinx — Complete Codebase Reference

> This is the single source-of-truth document for the Timelinx codebase. It is designed to be passed as context/knowledge to any engineer, AI agent, or contributor. Everything you need to know is here.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Monorepo Architecture](#2-monorepo-architecture)
3. [@timelinx/core — The Engine](#3-timelinxcore--the-engine)
4. [@timelinx/react — React Bindings](#4-timelinxreact--react-bindings)
5. [@timelinx/ui — UI Components](#5-timelinxui--ui-components)
6. [@timelinx/media-web — Media Adapters](#6-timelinxmedia-web--media-adapters)
7. [@timelinx/ai — AI Suggestions](#7-timelinxai--ai-suggestions)
8. [@timelinx/collab — Collaboration](#8-timelinxcollab--collaboration)
9. [Testing Infrastructure](#9-testing-infrastructure)
10. [Key Algorithms](#10-key-algorithms)
11. [Design Principles & Invariants](#11-design-principles--invariants)

---

## 1. Project Overview

**Timelinx** is an open-source, professional NLE (Non-Linear Editor) timeline engine for the web. It is a headless, deterministic, immutable-state TypeScript engine that provides the core editing kernel that could power browser-based video editors.

- **License:** MIT
- **Version:** 1.0.0-beta.1
- **Package Manager:** pnpm 10.28.2
- **Language:** TypeScript (strict mode, ES2020/ES2022 targets)
- **Build Tools:** tsup (core, react, ai, collab), Vite (ui library mode)
- **Test Framework:** Vitest + fast-check (property-based testing)

### Codebase Stats

| Metric | Count |
|--------|-------|
| Source files (.ts/.tsx) | 164 |
| Source lines of code | ~48,000 |
| Test files (.test.ts/.test.tsx) | 67 |
| Test lines of code | ~22,000 |
| CSS lines | ~1,500 |
| Type definition files (core) | 27 |
| Total operation types | 40+ |
| Total tools | 12 |
| Invariant checks | 9+ categories |
| Total tests | 850+ |

---

## 2. Monorepo Architecture

### Package Dependency Graph

```
@timelinx/core        (zero runtime dependencies)
  ↑
@timelinx/react       (depends on core; peer: react ^18/^19)
  ↑
@timelinx/ui          (depends on core + react as devDeps; peer: core + react + react-dom)

@timelinx/media-web   (depends on core)
@timelinx/ai          (depends on core)
@timelinx/collab      (depends on core)
```

### Directory Structure

```
timeline/
├── package.json              # Root package, pnpm@10.28.2
├── pnpm-workspace.yaml       # packages/* + apps/*
├── README.md
├── LICENSE (MIT)
├── docs/
│   ├── architecture.md       # Full architecture doc with ASCII diagrams
│   ├── comparison.md         # Competitive analysis
│   ├── CODEBASE.md           # This file
│   └── timelinx-core-test-plan.md
├── apps/                     # Empty (placeholder for demo app)
└── packages/
    ├── core/                 # 89 source files, ~14K lines — the engine
    ├── react/                # 11 source files, ~1.5K lines — React bindings
    ├── ui/                   # 25 source files, ~3.4K lines — UI components
    ├── media-web/            # 9 source files, ~2.2K lines — WebCodecs/WebAudio
    ├── ai/                   # 10 source files, ~1.8K lines — AI suggestions
    └── collab/               # 9 source files, ~1.9K lines — CRDT collab
```

### Root Scripts

```json
{
  "build": "pnpm --filter @timelinx/core build && pnpm --filter @timelinx/react build && ...",
  "dev": "cd apps/demo && pnpm dev",
  "test": "pnpm --filter @timelinx/core test && pnpm --filter @timelinx/react test && ..."
}
```

---

## 3. @timelinx/core — The Engine

The core package is the heart of Timelinx. **Zero runtime dependencies.** Framework-agnostic. Runs in browsers, Node.js, and Web Workers.

### 3.1 Export Entry Points

| Entry Point | File | Purpose |
|---|---|---|
| `./` (main) | `public-api.ts` | Core engine, operations, types, validation, history |
| `./serialization` | `serialization.ts` | Import/export: JSON, OTIO, EDL, AAF, FCPXML |
| `./media` | `media.ts` | Playback contracts, clock, PlayheadController |
| `./internal` | `internal.ts` | Internal utilities (not for public use) |

### 3.2 Type System (`src/types/` — 27 files)

#### Branded ID Types

All entity IDs are branded TypeScript types — structurally identical to `string` but type-incompatible at compile time. Created via `toXxx()` factory functions.

| Type | Brand | Factory | Source File |
|------|-------|---------|-------------|
| `ClipId` | `'ClipId'` | `toClipId(s)` | `clip.ts` |
| `TrackId` | `'TrackId'` | `toTrackId(s)` | `track.ts` |
| `AssetId` | `'AssetId'` | `toAssetId(s)` | `asset.ts` |
| `EffectId` | `'EffectId'` | `toEffectId(s)` | `effect.ts` |
| `KeyframeId` | `'KeyframeId'` | `toKeyframeId(s)` | `keyframe.ts` |
| `MarkerId` | `'MarkerId'` | `toMarkerId(s)` | `marker.ts` |
| `TransitionId` | `'TransitionId'` | `toTransitionId(s)` | `transition.ts` |
| `CaptionId` | `'CaptionId'` | `toCaptionId(s)` | `caption.ts` |
| `LinkGroupId` | `'LinkGroupId'` | `toLinkGroupId(s)` | `link-group.ts` |
| `TrackGroupId` | `'TrackGroupId'` | `toTrackGroupId(s)` | `track-group.ts` |
| `ProjectId` | `'ProjectId'` | `toProjectId(s)` | `project.ts` |
| `BinId` | `'BinId'` | `toBinId(s)` | `project.ts` |
| `GeneratorId` | `'GeneratorId'` | `toGeneratorId(s)` | `generator.ts` |
| `TimelineFrame` | `'TimelineFrame'` | `toFrame(n)` | `frame.ts` |
| `Timecode` | `'Timecode'` | `toTimecode(s)` | `frame.ts` |
| `ToolId` | `'ToolId'` | `toToolId(s)` | `tools/types.ts` |
| `GroupId` | `'GroupId'` | `toGroupId(s)` | `grouping.ts` |

#### TimelineState (`state.ts`)

The single source of truth for the entire engine. **Immutable — every mutation returns a new object.**

```typescript
type TimelineState = {
  readonly schemaVersion: number;        // must equal CURRENT_SCHEMA_VERSION (2)
  readonly timeline:      Timeline;
  readonly assetRegistry: AssetRegistry; // ReadonlyMap<AssetId, Asset>
};
```

#### Timeline (`timeline.ts`)

```typescript
type Timeline = {
  readonly id: string;
  readonly name: string;
  readonly fps: FrameRate;                    // 23.976 | 24 | 25 | 29.97 | 30 | 50 | 59.94 | 60
  readonly duration: TimelineFrame;
  readonly startTimecode: Timecode;
  readonly tracks: readonly Track[];
  readonly sequenceSettings: SequenceSettings;
  readonly version: number;                  // monotonic, +1 per accepted transaction
  readonly markers: readonly Marker[];
  readonly beatGrid: BeatGrid | null;
  readonly inPoint: TimelineFrame | null;
  readonly outPoint: TimelineFrame | null;
  readonly trackGroups?: readonly TrackGroup[];
  readonly linkGroups?: readonly LinkGroup[];
};

type SequenceSettings = {
  readonly pixelAspectRatio: number;         // default: 1
  readonly fieldOrder: 'progressive' | 'upper' | 'lower';
  readonly colorSpace: string;               // default: 'sRGB'
  readonly audioSampleRate: number;          // default: 48000
  readonly audioChannelCount: number;        // default: 2
};
```

#### Track (`track.ts`)

```typescript
type TrackType = 'video' | 'audio' | 'subtitle' | 'title';

type Track = {
  readonly id: TrackId;
  readonly name: string;
  readonly type: TrackType;
  readonly locked: boolean;
  readonly muted: boolean;
  readonly solo: boolean;
  readonly height: number;                   // default: 56, clamped 40-200
  readonly clips: readonly Clip[];           // always sorted ascending by timelineStart
  readonly captions: readonly Caption[];
  readonly blendMode?: string;
  readonly opacity?: number;                 // 0-1, default 1
  readonly groupId?: TrackGroupId;
};
```

#### Clip (`clip.ts`)

```typescript
type Clip = {
  readonly id: ClipId;
  readonly assetId: AssetId;
  readonly trackId: TrackId;
  readonly timelineStart: TimelineFrame;     // where on the track
  readonly timelineEnd: TimelineFrame;
  readonly mediaIn: TimelineFrame;           // which portion of the asset plays
  readonly mediaOut: TimelineFrame;
  readonly speed: number;                    // 1.0 = normal, > 0 always
  readonly enabled: boolean;
  readonly reversed: boolean;
  readonly name: string | null;
  readonly color: string | null;
  readonly metadata: Record<string, string>;
  readonly effects?: readonly Effect[];
  readonly transform?: ClipTransform;
  readonly audio?: AudioProperties;
  readonly transition?: Transition;
};
```

**Key clip invariants (speed=1.0):**
- `timelineEnd > timelineStart`
- `mediaOut > mediaIn`
- `(mediaOut - mediaIn) === (timelineEnd - timelineStart)`
- `mediaIn >= 0`
- `mediaOut <= asset.intrinsicDuration`
- `timelineEnd <= timeline.duration`
- `speed > 0`

#### Asset (`asset.ts`)

Discriminated union: `FileAsset | GeneratorAsset`.

```typescript
type FileAsset = {
  readonly kind: 'file';
  readonly id: AssetId;
  readonly name: string;
  readonly mediaType: TrackType;             // must match track.type for any clip placed on track
  readonly filePath: string;
  readonly intrinsicDuration: TimelineFrame;
  readonly nativeFps: FrameRate;
  readonly sourceTimecodeOffset: TimelineFrame;
  readonly status: AssetStatus;             // 'online' | 'offline' | 'proxy-only' | 'missing'
};

type GeneratorAsset = {
  readonly kind: 'generator';
  readonly id: AssetId;
  readonly name: string;
  readonly mediaType: TrackType;
  readonly intrinsicDuration: TimelineFrame;
  readonly nativeFps: FrameRate;
  readonly sourceTimecodeOffset: TimelineFrame;
  readonly status: AssetStatus;
  readonly generatorDef: Generator;
};
```

#### Frame Rate (`frame.ts`)

```typescript
type FrameRate = 23.976 | 24 | 25 | 29.97 | 30 | 50 | 59.94 | 60;

const FrameRates = {
  CINEMA: 24,
  PAL: 25,
  NTSC_DF: 29.97,
  NTSC: 30,
  PAL_HFR: 50,
  NTSC_HFR: 59.94,
  HFR: 60,
};

type TimelineFrame = number & { readonly __brand: "TimelineFrame" };
type Timecode = string & { readonly __brand: "Timecode" };
type RationalTime = { readonly value: number; readonly rate: FrameRate };
type TimeRange = { readonly startFrame: TimelineFrame; readonly duration: TimelineFrame };
```

#### Effect (`effect.ts`)

```typescript
type RenderStage = 'preComposite' | 'postComposite' | 'output';

type Effect = {
  readonly id: EffectId;
  readonly effectType: EffectType;           // open string: 'blur', 'lut', 'colorCorrect', etc.
  readonly enabled: boolean;
  readonly renderStage: RenderStage;
  readonly params: readonly EffectParam[];   // { key, value: number|string|boolean }[]
  readonly keyframes: readonly Keyframe[];
};
```

#### Keyframe (`keyframe.ts`)

```typescript
type Keyframe = {
  readonly id: KeyframeId;
  readonly frame: TimelineFrame;
  readonly value: number;
  readonly easing: EasingCurve;
};
```

#### Easing Curves (`easing.ts`)

```typescript
type EasingCurve =
  | { readonly kind: 'Linear' }
  | { readonly kind: 'Hold' }
  | { readonly kind: 'EaseIn'; readonly power: number }
  | { readonly kind: 'EaseOut'; readonly power: number }
  | { readonly kind: 'EaseBoth'; readonly power: number }
  | { readonly kind: 'BezierCurve'; readonly p1x: number; readonly p1y: number; readonly p2x: number; readonly p2y: number };

const LINEAR_EASING: EasingCurve = { kind: 'Linear' };
const HOLD_EASING: EasingCurve = { kind: 'Hold' };
```

#### Transition (`transition.ts`)

```typescript
type TransitionAlignment = 'centerOnCut' | 'endAtCut' | 'startAtCut';

type Transition = {
  readonly id: TransitionId;
  readonly type: TransitionType;             // open string: 'dissolve', 'wipe', 'dip', etc.
  readonly durationFrames: number;
  readonly alignment: TransitionAlignment;
  readonly easing: EasingCurve;
  readonly params: readonly TransitionParam[];
};
```

#### Clip Transform (`clip-transform.ts`)

```typescript
type AnimatableProperty = {
  readonly value: number;
  readonly keyframes: readonly Keyframe[];
};

type ClipTransform = {
  readonly positionX: AnimatableProperty;   // pixels, default 0
  readonly positionY: AnimatableProperty;   // pixels, default 0
  readonly scaleX: AnimatableProperty;      // multiplier, default 1
  readonly scaleY: AnimatableProperty;      // multiplier, default 1
  readonly rotation: AnimatableProperty;    // degrees, default 0
  readonly opacity: AnimatableProperty;     // 0-1, default 1
  readonly anchorX: AnimatableProperty;     // pixels, default 0
  readonly anchorY: AnimatableProperty;     // pixels, default 0
};
```

#### Audio Properties (`audio-properties.ts`)

```typescript
type ChannelRouting = 'stereo' | 'mono' | 'left' | 'right';

type AudioProperties = {
  readonly gain: AnimatableProperty;        // dB, default 0
  readonly pan: AnimatableProperty;         // -1 to 1, default 0
  readonly mute: boolean;                   // default false
  readonly channelRouting: ChannelRouting;  // default 'stereo'
  readonly normalizationGain: number;       // dB, default 0
};
```

#### Marker (`marker.ts`)

Discriminated union: point (single frame) or range (frameStart..frameEnd).

```typescript
type MarkerScope = 'global' | 'personal' | 'export';

type Marker =
  | { readonly type: 'point'; readonly id: MarkerId; readonly frame: TimelineFrame; readonly label: string; readonly color: string; readonly scope: MarkerScope; readonly linkedClipId: ClipId | null; readonly clipId?: ClipId }
  | { readonly type: 'range'; readonly id: MarkerId; readonly frameStart: TimelineFrame; readonly frameEnd: TimelineFrame; readonly label: string; readonly color: string; readonly scope: MarkerScope; readonly linkedClipId: ClipId | null; readonly clipId?: ClipId };

type BeatGrid = {
  readonly bpm: number;
  readonly timeSignature: readonly [number, number];
  readonly offset: TimelineFrame;
};
```

#### Caption (`caption.ts`)

```typescript
type Caption = {
  readonly id: CaptionId;
  readonly text: string;
  readonly startFrame: TimelineFrame;
  readonly endFrame: TimelineFrame;
  readonly language: string;                 // BCP-47: 'en-US', 'fr-FR'
  readonly style: CaptionStyle;
  readonly burnIn: boolean;
};

type CaptionStyle = {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly color: string;
  readonly backgroundColor: string;
  readonly hAlign: 'left' | 'center' | 'right';
  readonly vAlign: 'top' | 'center' | 'bottom';
};
```

#### Link Group (`link-group.ts`)

Locks A/V clips in sync; when one moves, all move together.

```typescript
type LinkGroup = {
  readonly id: LinkGroupId;
  readonly clipIds: readonly ClipId[];       // Min 2 clips
};
```

#### Track Group (`track-group.ts`)

Logical grouping of tracks (e.g. for nesting or UI collapse).

```typescript
type TrackGroup = {
  readonly id: TrackGroupId;
  readonly label: string;
  readonly trackIds: readonly TrackId[];
  readonly collapsed: boolean;
};
```

#### Generator (`generator.ts`)

```typescript
type GeneratorType = 'solid' | 'bars' | 'countdown' | 'noise' | 'text';

type Generator = {
  readonly id: GeneratorId;
  readonly type: GeneratorType;
  readonly params: Record<string, unknown>;
  readonly duration: TimelineFrame;
  readonly name: string;
};
```

#### Compression (`compression.ts`)

```typescript
type CompressionPolicy =
  | { readonly kind: 'none' }
  | { readonly kind: 'last-write-wins'; readonly windowMs: number };

type CompressibleOpType =
  | 'MOVE_CLIP' | 'SET_CLIP_TRANSFORM' | 'SET_AUDIO_PROPERTIES'
  | 'SET_EFFECT_PARAM' | 'MOVE_KEYFRAME' | 'SET_TRANSITION_DURATION'
  | 'MOVE_MARKER' | 'SET_IN_POINT' | 'SET_OUT_POINT' | 'SET_TRACK_OPACITY';

const DEFAULT_COMPRESSION_POLICY: CompressionPolicy = { kind: 'last-write-wins', windowMs: 300 };
const NO_COMPRESSION: CompressionPolicy = { kind: 'none' };
```

#### Pipeline Contracts (`pipeline.ts`)

Core defines the CONTRACT (types + interfaces). Host app provides the IMPLEMENTATION. Core never does actual decoding or compositing.

```typescript
type VideoDecoder = (request: VideoFrameRequest) => Promise<VideoFrameResult>;
type AudioDecoder = (request: AudioChunkRequest) => Promise<AudioChunkResult>;
type Compositor = (request: CompositeRequest) => Promise<CompositeResult>;
type ThumbnailProvider = (request: ThumbnailRequest) => Promise<ThumbnailResult>;

type PipelineConfig = {
  readonly videoDecoder: VideoDecoder;
  readonly audioDecoder?: AudioDecoder;
  readonly compositor: Compositor;
  readonly thumbnailProvider?: ThumbnailProvider;
};
```

#### Playhead (`playhead.ts`)

```typescript
type PlaybackRate = number;                  // 1.0=normal, 0.5=half, 2.0=double, -1.0=reverse, 0=paused
type PlaybackQuality = 'full' | 'half' | 'quarter' | 'proxy';

type PlayheadState = {
  readonly currentFrame: TimelineFrame;
  readonly isPlaying: boolean;
  readonly playbackRate: PlaybackRate;
  readonly quality: PlaybackQuality;
  readonly durationFrames: number;
  readonly fps: number;
  readonly loopRegion: LoopRegion | null;
  readonly prerollFrames: number;
  readonly postrollFrames: number;
};

type PlayheadEventType = 'play' | 'pause' | 'seek' | 'loop' | 'frame-dropped' | 'ended' | 'loop-point' | 'state';
```

#### Keyboard (`keyboard.ts`)

```typescript
type TimelineKeyAction =
  | 'play-pause' | 'stop' | 'jog-forward' | 'jog-backward' | 'jog-stop'
  | 'step-forward' | 'step-backward' | 'seek-start' | 'seek-end'
  | 'next-clip' | 'prev-clip' | 'next-marker' | 'prev-marker'
  | 'mark-in' | 'mark-out' | 'toggle-loop';

type KeyBinding = {
  readonly code: string;
  readonly shift?: boolean;
  readonly alt?: boolean;
  readonly meta?: boolean;
  readonly ctrl?: boolean;
  readonly action: TimelineKeyAction;
  readonly repeat?: boolean;
};
```

Default bindings: Space=play/pause, J/K/L=jog, ←/→=step, Shift+←/→=next/prev clip, Alt+←/→=next/prev marker, I=mark-in, O=mark-out, Q=toggle-loop.

#### State Change Diff (`state-change.ts`)

```typescript
type StateChange = {
  readonly trackIds: boolean;
  readonly clipIds: ReadonlySet<ClipId>;
  readonly markers: boolean;
  readonly timeline: boolean;
  readonly playhead: boolean;
  readonly assetRegistry: boolean;
};
```

#### Validation Types (`validation.ts`)

```typescript
interface ValidationError { code: string; message: string; context?: Record<string, unknown>; }
interface ValidationResult { valid: boolean; errors: ValidationError[]; }
```

#### Project (`project.ts`)

```typescript
type Project = {
  readonly id: ProjectId;
  readonly name: string;
  readonly timelines: readonly TimelineState[];
  readonly bins: readonly Bin[];
  readonly rootBinIds: readonly BinId[];
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly schemaVersion: number;
};

type BinItem =
  | { readonly kind: 'asset'; readonly assetId: AssetId }
  | { readonly kind: 'sequence'; readonly timelineId: string }
  | { readonly kind: 'bin'; readonly binId: BinId };
```

#### Worker Contracts (`worker-contracts.ts`)

Types for off-main-thread waveform and thumbnail computation.

```typescript
type WaveformRequest = { requestId, assetId, channel, startFrame, endFrame, buckets, sampleRate };
type WaveformPeak = { min, max, rms };
type ThumbnailQueueEntry = { request, priority: 'high'|'normal'|'low', addedAt };
```

---

### 3.3 Operations (`src/types/operations.ts`)

The **only** way to express a mutation. All mutations flow through: `OperationPrimitive[] → Transaction → dispatch()`.

#### Transaction

```typescript
type Transaction = {
  readonly id: string;
  readonly label: string;
  readonly timestamp: number;
  readonly operations: readonly OperationPrimitive[];
};
```

#### OperationPrimitive (discriminated union — 40+ variants)

**Clip Operations:**
| Type | Fields | Notes |
|------|--------|-------|
| `MOVE_CLIP` | `clipId, newTimelineStart, targetTrackId?` | Moves clip position |
| `RESIZE_CLIP` | `clipId, edge: 'start'\|'end', newFrame` | Trims clip edge |
| `SLICE_CLIP` | `clipId, atFrame` | Splits clip at frame |
| `DELETE_CLIP` | `clipId` | Removes clip |
| `INSERT_CLIP` | `clip: Clip, trackId` | Adds new clip |
| `SET_MEDIA_BOUNDS` | `clipId, mediaIn, mediaOut` | Changes media viewport |
| `SET_CLIP_ENABLED` | `clipId, enabled` | Enable/disable |
| `SET_CLIP_REVERSED` | `clipId, reversed` | Reverse playback |
| `SET_CLIP_SPEED` | `clipId, speed` | Speed > 0 |
| `SET_CLIP_COLOR` | `clipId, color` | Color label |
| `SET_CLIP_NAME` | `clipId, name` | Display name |

**Track Operations:**
| Type | Fields |
|------|--------|
| `ADD_TRACK` | `track: Track` |
| `DELETE_TRACK` | `trackId` |
| `REORDER_TRACK` | `trackId, newIndex` |
| `SET_TRACK_HEIGHT` | `trackId, height` (clamped 40-200) |
| `SET_TRACK_NAME` | `trackId, name` |

**Asset Operations:**
| Type | Fields |
|------|--------|
| `REGISTER_ASSET` | `asset: Asset` |
| `UNREGISTER_ASSET` | `assetId` (rejected if in use) |
| `SET_ASSET_STATUS` | `assetId, status` |

**Timeline Operations:**
| Type | Fields |
|------|--------|
| `RENAME_TIMELINE` | `name` |
| `SET_TIMELINE_DURATION` | `duration: TimelineFrame` |
| `SET_TIMELINE_START_TC` | `startTimecode: Timecode` |
| `SET_SEQUENCE_SETTINGS` | `settings: Partial<SequenceSettings>` |

**Marker Operations:**
| Type | Fields |
|------|--------|
| `ADD_MARKER` | `marker: Marker` |
| `MOVE_MARKER` | `markerId, newFrame` |
| `DELETE_MARKER` | `markerId` |

**In/Out & Beat Grid:**
| Type | Fields |
|------|--------|
| `SET_IN_POINT` | `frame: TimelineFrame \| null` |
| `SET_OUT_POINT` | `frame: TimelineFrame \| null` |
| `ADD_BEAT_GRID` | `beatGrid: BeatGrid` |
| `REMOVE_BEAT_GRID` | (none) |

**Generator:**
| Type | Fields |
|------|--------|
| `INSERT_GENERATOR` | `generator, trackId, atFrame` |

**Caption Operations:**
| Type | Fields |
|------|--------|
| `ADD_CAPTION` | `caption, trackId` |
| `EDIT_CAPTION` | `captionId, trackId, text?, language?, style?, burnIn?, startFrame?, endFrame?` |
| `DELETE_CAPTION` | `captionId, trackId` |

**Effect & Keyframe Operations:**
| Type | Fields |
|------|--------|
| `ADD_EFFECT` | `clipId, effect: Effect` |
| `REMOVE_EFFECT` | `clipId, effectId` |
| `REORDER_EFFECT` | `clipId, effectId, newIndex` |
| `SET_EFFECT_ENABLED` | `clipId, effectId, enabled` |
| `SET_EFFECT_PARAM` | `clipId, effectId, key, value` |
| `ADD_KEYFRAME` | `clipId, effectId, keyframe: Keyframe` |
| `MOVE_KEYFRAME` | `clipId, effectId, keyframeId, newFrame` |
| `DELETE_KEYFRAME` | `clipId, effectId, keyframeId` |
| `SET_KEYFRAME_EASING` | `clipId, effectId, keyframeId, easing` |

**Transform, Audio, Transitions, Groups:**
| Type | Fields |
|------|--------|
| `SET_CLIP_TRANSFORM` | `clipId, transform: Partial<ClipTransform>` |
| `SET_AUDIO_PROPERTIES` | `clipId, properties: Partial<AudioProperties>` |
| `ADD_TRANSITION` | `clipId, transition: Transition` |
| `DELETE_TRANSITION` | `clipId` |
| `SET_TRANSITION_DURATION` | `clipId, durationFrames` |
| `SET_TRANSITION_ALIGNMENT` | `clipId, alignment` |
| `LINK_CLIPS` | `linkGroup: LinkGroup` |
| `UNLINK_CLIPS` | `linkGroupId` |
| `ADD_TRACK_GROUP` | `trackGroup: TrackGroup` |
| `DELETE_TRACK_GROUP` | `trackGroupId` |
| `SET_TRACK_BLEND_MODE` | `trackId, blendMode` |
| `SET_TRACK_OPACITY` | `trackId, opacity` |

#### DispatchResult

```typescript
type RejectionReason =
  | 'OVERLAP' | 'LOCKED_TRACK' | 'ASSET_MISSING' | 'TYPE_MISMATCH'
  | 'OUT_OF_BOUNDS' | 'MEDIA_BOUNDS_INVALID' | 'ASSET_IN_USE'
  | 'TRACK_NOT_EMPTY' | 'SPEED_INVALID' | 'INVARIANT_VIOLATED'
  | 'NOT_FOUND' | 'BEAT_GRID_EXISTS' | 'CLIP_NOT_FOUND'
  | 'DUPLICATE_EFFECT_ID' | 'EFFECT_NOT_FOUND' | 'EFFECT_INDEX_OUT_OF_RANGE'
  | 'KEYFRAME_NOT_FOUND' | 'DUPLICATE_KEYFRAME_ID' | 'INVALID_RANGE'
  | 'TRANSITION_NOT_FOUND' | 'LINK_GROUP_NOT_FOUND' | 'TRACK_GROUP_NOT_FOUND'
  | 'DUPLICATE_LINK_GROUP_ID' | 'DUPLICATE_TRACK_GROUP_ID'
  | 'INVALID_OPACITY' | 'TRACK_NOT_FOUND';

type DispatchResult =
  | { accepted: true;  nextState: TimelineState }
  | { accepted: false; reason: RejectionReason; message: string };
```

---

### 3.4 Engine (`src/engine/` — 29 files)

#### dispatch() (`dispatcher.ts`) — The ONLY mutation path

```
dispatch(state, transaction):
  1. For each operation: validateOperation(rollingState, op) → reject on failure
  2. Apply all operations sequentially: applyOperation(proposedState, op)
  3. checkInvariants(proposedState) → reject on any violation
  4. Bump timeline.version by 1
  5. Return { accepted: true, nextState }
```

**Rolling validation:** Each op is validated against the state produced by the previous op. This is critical for compound transactions like `[DELETE_CLIP, INSERT_CLIP(left), INSERT_CLIP(right)]`.

**All-or-nothing:** If any primitive fails, zero primitives are applied.

#### apply.ts — The giant switch statement

Handles every `OperationPrimitive` type. ~650 lines. Pure function — returns new state.

#### History System (`history.ts`)

Two APIs:

1. **Pure functions** (recommended for tests):
```typescript
type HistoryState = { past: TimelineState[]; present: TimelineState; future: TimelineState[]; limit: number };
function createHistory(initialState, limit = 50): HistoryState;
function pushHistory(history, newState): HistoryState;
function undo(history): HistoryState;
function redo(history): HistoryState;
function canUndo(history): boolean;
function canRedo(history): boolean;
function getCurrentState(history): TimelineState;
```

2. **HistoryStack class** (with compression, checkpoints, persistence):
```typescript
class HistoryStack {
  constructor(maxSize, compressionPolicy?, clock?)
  push(entry)
  pushWithCompression(entry, transaction)
  undo(): TimelineState | null
  redo(): TimelineState | null
  saveCheckpoint(name: string)
  restoreCheckpoint(name: string): HistoryEntry | null
  listCheckpoints(): string[]
  clearCheckpoint(name: string)
  serialize(): string
  static deserialize(json: string): HistoryStack
  softLimitWarning(): boolean  // true at 80%+
}
```

#### TransactionCompressor (`transaction-compressor.ts`)

Rapid same-type ops within a time window (default: 300ms) are merged into a single history entry (last-write-wins). Compressible op types: MOVE_CLIP, SET_CLIP_TRANSFORM, SET_AUDIO_PROPERTIES, SET_EFFECT_PARAM, MOVE_KEYFRAME, SET_TRANSITION_DURATION, MOVE_MARKER, SET_IN_POINT, SET_OUT_POINT, SET_TRACK_OPACITY.

#### TimelineEngine Class (`timeline-engine.ts`)

OO wrapper around the core engine. Used by the React package.

```typescript
class TimelineEngine {
  constructor(initialState: TimelineState)
  getState(): TimelineState
  dispatch(transaction: Transaction): DispatchResult
  // Clip operations
  addClip(trackId, clip): Result
  removeClip(clipId): Result
  moveClip(clipId, newStart): Result
  resizeClip(clipId, edge, newFrame): Result
  // Track operations
  addTrack(track): Result
  removeTrack(trackId): Result
  // History
  undo(): boolean
  redo(): boolean
  canUndo(): boolean
  canRedo(): boolean
  // Playback
  play(): void
  pause(): void
  seek(frame): void
  // Selection
  getSelectedClipIds(): ReadonlySet<ClipId>
  selectClip(clipId): void
  // Queries
  findClipById(clipId): Clip | null
  getClipsOnTrack(trackId): Clip[]
}
```

#### Serialization (`serializer.ts`)

```typescript
function serializeTimeline(state: TimelineState): string;    // JSON
function deserializeTimeline(raw: string): TimelineState;     // JSON → state
function remapAssetPaths(state, callback): TimelineState;     // repath assets
```

#### OTIO Interchange

```typescript
// Export
function exportToOTIO(state: TimelineState): OTIODocument;
// Import
function importFromOTIO(doc: OTIODocument, options?: OTIOImportOptions): TimelineState;
```

#### EDL Export (CMX 3600)

```typescript
function exportToEDL(state: TimelineState, options?: EDLExportOptions): string;
// Single video track only. Lossy: no keyframes, no effects, no transitions.
```

#### AAF Export

```typescript
function exportToAAF(state: TimelineState, options?: AAFExportOptions): string;
// Simplified AAF XML. Lossy: no keyframe data.
```

#### FCPXML Export

```typescript
function exportToFCPXML(state: TimelineState, options?: FCPXMLExportOptions): string;
// Final Cut Pro XML 1.10 interchange. Simplified.
```

#### Other Engine Modules

| Module | Purpose |
|--------|---------|
| `apply.ts` | Giant switch statement applying each OperationPrimitive |
| `migrator.ts` | Schema version migration chain (any version → CURRENT_SCHEMA_VERSION) |
| `frame-resolver.ts` | Resolves which clips are at a given timeline frame |
| `playhead-controller.ts` | Manages playhead position, play/pause, seek, loop |
| `playback-engine.ts` | Drives the clock, requests frames from pipeline |
| `clock.ts` | High-resolution clock for playback timing |
| `interval-tree.ts` | Centered interval tree for O(log n + k) clip range queries |
| `track-index.ts` | Fast track-level lookups |
| `virtual-window.ts` | Virtual windowing for large timelines |
| `snap-index-manager.ts` | Async snap index rebuild |
| `transaction-compressor.ts` | Last-write-wins compression for rapid same-type ops |
| `marker-search.ts` | Binary search for nearest marker |
| `thumbnail-cache.ts` | LRU cache for decoded thumbnails |
| `thumbnail-queue.ts` | Priority queue for thumbnail generation |
| `keyboard-handler.ts` | Configurable key binding system |
| `project-ops.ts` | addTimeline, removeTimeline on Project |
| `project-serializer.ts` | serializeProject, deserializeProject |
| `subtitle-import.ts` | SRT/VTT subtitle import |
| `serialization-error.ts` | Custom error class for serialization failures |
| `snap-index-manager.ts` | Manages async snap index rebuilds |

---

### 3.5 Operations (`src/operations/` — 4 files)

Pure functions that return new state. **Not called directly in the dispatch flow** — they are used by the engine's legacy shim.

| File | Functions |
|------|-----------|
| `clip-operations.ts` | `addClip`, `removeClip`, `moveClip`, `resizeClip`, `trimClip`, `updateClip`, `moveClipToTrack` |
| `track-operations.ts` | `addTrack`, `removeTrack`, `moveTrack`, `updateTrack`, `toggleTrackMute`, `toggleTrackLock`, `toggleTrackSolo`, `setTrackHeight` |
| `timeline-operations.ts` | Timeline-level pure operations |
| `ripple.ts` | Ripple edit calculations |

---

### 3.6 Tools (`src/tools/` — 15 files)

#### ITool Interface (`tools/types.ts`)

```typescript
interface ITool {
  readonly id: ToolId;
  readonly shortcutKey: string;              // single char, e.g. 'v', 'b', 'r'

  getCursor(ctx: ToolContext): string;       // CSS cursor string
  getSnapCandidateTypes(): readonly SnapPointType[];

  onPointerDown(event: TimelinePointerEvent, ctx: ToolContext): void;
  onPointerMove(event: TimelinePointerEvent, ctx: ToolContext): ProvisionalState | null;
  onPointerUp(event: TimelinePointerEvent, ctx: ToolContext): Transaction | null;
  onKeyDown(event: TimelineKeyEvent, ctx: ToolContext): Transaction | null;
  onKeyUp(event: TimelineKeyEvent, ctx: ToolContext): void;
  onCancel(): void;
}
```

**Contract rules:**
- `onPointerMove` NEVER calls dispatch, NEVER mutates instance state
- `onPointerUp` NEVER mutates instance state
- `onKeyDown`, `onKeyUp`, `onCancel` are REQUIRED — implement as no-ops if unused

#### ToolContext (injected by engine)

```typescript
type ToolContext = {
  readonly state: TimelineState;
  readonly snapIndex: SnapIndex;
  readonly pixelsPerFrame: number;
  readonly modifiers: Modifiers;
  readonly frameAtX: (x: number) => TimelineFrame;
  readonly trackAtY: (y: number) => TrackId | null;
  readonly snap: (frame, exclude?, allowedTypes?) => TimelineFrame;
};
```

#### TimelinePointerEvent

```typescript
type TimelinePointerEvent = {
  readonly frame: TimelineFrame;
  readonly trackId: TrackId | null;
  readonly clipId: ClipId | null;
  readonly x: number;                        // client pixels
  readonly y: number;
  readonly buttons: number;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly edge?: 'left' | 'right' | 'none'; // trim hit zone
};
```

#### ProvisionalState

Ghost state for live preview during drag/trim — returned by `onPointerMove`.

```typescript
type ProvisionalState = {
  readonly clips: readonly Clip[];
  readonly rubberBand?: RubberBandRegion;    // marquee selection drag
  readonly isProvisional: true;              // compile-time discriminant
};
```

#### 12 Tools

| Tool | ID | Shortcut | File | Description |
|------|----|----------|------|-------------|
| SelectionTool | `'select'` | `V` | `selection.ts` | Click, marquee, add/remove selection, multi-clip drag |
| RazorTool | `'razor'` | `C` | `razor.ts` | Split clips at playhead/cursor |
| RippleTrimTool | `'rippleTrim'` | `T` | `ripple-trim.ts` | Trim with ripple (shifts downstream clips) |
| RollTrimTool | `'rollTrim'` | `R` | `roll-trim.ts` | Trim with roll (adjusts cut between two clips) |
| SlipTool | `'slip'` | `S` | `slip.ts` | Slip media in/out (same timeline position, different media) |
| SlideTool | `'slide'` | `Y` | `slide-tool.ts` | Slide clip in timeline (trims neighbors) |
| RippleDeleteTool | `'rippleDelete'` | — | `ripple-delete.ts` | Delete with ripple (shifts downstream) |
| RippleInsertTool | `'rippleInsert'` | — | `ripple-insert.ts` | Insert with ripple |
| HandTool | `'hand'` | `H` | `hand.ts` | Pan timeline |
| TransitionTool | `'transition'` | — | `transition-tool.ts` | Add transitions between clips |
| KeyframeTool | `'keyframe'` | — | `keyframe-tool.ts` | Add/edit keyframes |
| ZoomTool | `'zoom'` | — | `zoom-tool.ts` | Zoom to selection |

#### Supporting Tool Files

| File | Purpose |
|------|---------|
| `registry.ts` | `ToolRegistry` — manages available tools, active tool |
| `provisional.ts` | `ProvisionalManager` — manages ghost/preview state |
| `types.ts` | `ITool` interface, event types, context types |

---

### 3.7 Validation

#### `checkInvariants(state)` (`validation/invariants.ts`)

Runs after every dispatch. Returns `InvariantViolation[]` (empty = valid).

**Checks performed:**
1. **Schema version** — must equal `CURRENT_SCHEMA_VERSION`; early-returns on mismatch
2. **Overlap** — no overlapping clips on same track (binary search, O(log n))
3. **Media bounds** — `mediaOut > mediaIn`, `mediaIn >= 0`, `mediaOut <= asset.intrinsicDuration`
4. **Asset exists** — every `clip.assetId` exists in `assetRegistry`
5. **Track type match** — clip's asset mediaType matches track's type
6. **Clip beyond timeline** — `clip.timelineEnd <= timeline.duration`
7. **Duration mismatch** — `(mediaOut - mediaIn)` matches timeline duration accounting for speed
8. **Speed valid** — `clip.speed > 0`
9. **Track sorted** — clips ascending by `timelineStart`
10. **Markers** — point markers within bounds, range markers valid
11. **In/Out points** — valid if set
12. **Beat grid** — valid if set
13. **Captions** — within bounds, no overlaps
14. **Effects** — valid render stage, keyframes sorted
15. **Track groups** — referenced tracks exist
16. **Link groups** — referenced clips exist
17. **Opacity** — 0-1 range

#### `validateOperation(state, op)` (`validation/validators.ts`)

Per-primitive validation. Runs BEFORE apply. Returns `Rejection | null`.

Handles 42 operation types. Key validations:
- **LOCKED_TRACK** — clip edits rejected on locked tracks
- **OVERLAP** — insert/move rejected if would overlap
- **ASSET_MISSING** — clip references non-existent asset
- **TYPE_MISMATCH** — clip placed on wrong track type
- **SPEED_INVALID** — speed must be > 0
- **ASSET_IN_USE** — can't unregister asset referenced by clips
- **OUT_OF_BOUNDS** — frame values out of range
- **DUPLICATE_*_ID** — no duplicate effect/keyframe IDs

---

### 3.8 Systems (`src/systems/` — 3 files)

| File | Purpose |
|------|---------|
| `queries.ts` | Read-only query functions against TimelineState |
| `asset-registry.ts` | Asset registration, lookup, status management |
| `validation.ts` | Higher-level validation utilities |

---

### 3.9 Snap Index (`src/snap-index.ts`)

Pure functions for building snap points from state.

```typescript
type SnapPointType = 'ClipStart' | 'ClipEnd' | 'Playhead' | 'Marker' | 'InPoint' | 'OutPoint' | 'BeatGrid';

type SnapPoint = {
  readonly frame: TimelineFrame;
  readonly type: SnapPointType;
  readonly priority: number;                 // Marker:100, In/Out:90, Clip:80, Playhead:70, BeatGrid:50
  readonly trackId: TrackId | null;
  readonly sourceId: string;
};

type SnapIndex = {
  readonly points: readonly SnapPoint[];     // sorted ascending by frame
  readonly builtAt: number;
  readonly enabled: boolean;
};

function buildSnapIndex(state: TimelineState, playheadFrame: TimelineFrame): SnapIndex;
function findNearestSnap(index: SnapIndex, frame, exclude?, allowedTypes?): TimelineFrame;
```

**Binary search** for nearest snap point. Handles priority, exclusion list, and type filter.

---

### 3.10 Public API (`public-api.ts`)

Stable contract surface. Internal files are not exported and may change without notice.

**Exported:**
- Core factories: `createTimeline`, `createTrack`, `createClip`, `createAsset`, `createTimelineState`
- Frame utilities: `frame`, `frameRate`, `toFrame`, `toTimecode`, `FrameRates`, `isDropFrame`
- Frame utils: `framesToTimecode`, `framesToSeconds`, `secondsToFrames`
- High-level engine: `TimelineEngine`
- Dispatcher: `dispatch`
- Invariant checker: `checkInvariants`
- History: `createHistory`, `pushHistory`, `undo`, `redo`, `canUndo`, `canRedo`, `getCurrentState`, `HistoryStack`
- Compression: `DEFAULT_COMPRESSION_POLICY`, `NO_COMPRESSION`, `TransactionCompressor`
- All types from `types/operations.ts`

---

## 4. @timelinx/react — React Bindings

### 4.1 TimelineEngine Class (`engine.ts` — 533 lines)

The central orchestrator. Wires together:
- `coreDispatch` from @timelinx/core
- `HistoryStack` (undo/redo with compression)
- `PlaybackEngine` (optional, pipeline-based)
- `SnapIndexManager` (async snap index rebuild)
- `TrackIndex` (fast track-level queries)
- `KeyboardHandler` (configurable key bindings)
- `ProvisionalManager` (ghost/drag preview state)
- `ToolRegistry` (12 default tools)
- `EngineSnapshot` (for useSyncExternalStore)

Exposes `subscribe` and `getSnapshot` for `useSyncExternalStore`.

### 4.2 Hooks (`hooks/` — 16 hooks)

All use `useSyncExternalStore` for React 18+ concurrent features.

**Context-based hooks (inside TimelineProvider):**

| Hook | Returns |
|------|---------|
| `useEngine()` | `TimelineEngine` |
| `useTimeline()` | Full `Timeline` (tracks, clips, markers, selection) |
| `useTrackIds()` | Ordered track ID list |
| `useTrack(id)` | Single track by ID |
| `useClip(id)` | Single clip with provisional awareness + selector isolation |
| `useClips(trackId)` | Multiple clips with selector |
| `useMarkers()` | All markers |
| `useHistory()` | `{ canUndo, canRedo }` |
| `usePlayheadFrame()` | Current playhead frame |
| `useIsPlaying()` | boolean |
| `useActiveToolId()` | Currently active tool ID |
| `useProvisional()` | `ProvisionalState \| null` |
| `useSelectedClipIds()` | `ReadonlySet<string>` |
| `useCursor()` | Current cursor string |

**Engine-first hooks (without context):**
- `useTimelineWithEngine(engine)`, `useTrackIdsWithEngine(engine)`, `useTrackWithEngine(engine, id)`, `useClipWithEngine(engine, id)`, `useProvisionalWithEngine(engine)`

**Playhead hooks:**
- `usePlayhead` — full playhead state + stable action callbacks (play, pause, seek, etc.)
- `usePlayheadEvent` — subscribe to specific playhead events

### 4.3 TimelineProvider (`TimelineProvider.tsx`)

React context provider. Manages `TimelineEngine` instance and provides it to child hooks.

### 4.4 Tool Router (`adapter/tool-router.ts` — 181 lines)

Converts React pointer/keyboard events to engine events with rAF-throttled pointer move.

### 4.5 Virtual Rendering

- `useVirtualWindow` — calculates visible frame range
- `useVisibleClips` — returns only clips in viewport (cached)

### 4.6 Tests (7 files)

- `engine.test.ts`, `hooks.test.ts`, `hooks-r2.test.ts`, `provider.test.ts`, `playhead-hooks.test.ts`, `integration.test.ts`, `tool-router.test.ts`

---

## 5. @timelinx/ui — UI Components

### 5.1 Components (20 .tsx files)

| Component | Description |
|-----------|-------------|
| `TimelineEditor` | Full drop-in editor: toolbar + ruler + tracks + clips + playhead + keyboard + drag-drop |
| `TimelineToolbar` | Tool buttons, zoom, undo/redo, play/pause |
| `TimelineRuler` | Canvas-rendered timecodes with smart tick intervals |
| `TimelineTrack` | Track header with mute/lock controls |
| `TimelineClip` | Clip rendering with trim handles, type icons |
| `TimelinePlayhead` | Playhead with CSS transform positioning |
| `ZoomControls` | Slider + buttons for zoom |
| `TrackList` | Decomposed track list with resize handles |
| `SnapIndicator` | Snap point visualization |
| `DropZone` | Drag-drop target indicator |
| `MarkersPanel` | Markers panel |
| `CaptionsPanel` | Captions panel |
| `TransitionsPanel` | Transitions panel |
| `KeyframesPanel` | Keyframes panel |
| `InspectorPanel` | Inspector panel |
| `AssetBin` | Asset bin panel |
| `KeyboardShortcutsOverlay` | Keyboard shortcut reference modal (Cmd+?) |
| `CommandPalette` | Command palette (Cmd+K) |
| `icons.tsx` | 20+ icon wrappers using lucide-react, `TOOL_ICONS` and `TRACK_TYPE_ICONS` maps |

### 5.2 CSS Token System

| File | Lines | Description |
|------|-------|-------------|
| `tokens.css` | 210 | Full design token system (colors, spacing, typography) |
| `structure.css` | 1043 | Complete NLE chrome styles |
| `presets/dark-pro.css` | — | Dark professional theme (DaVinci-inspired) |
| `presets/light.css` | — | Light theme (Final Cut Pro-inspired) |
| `presets/high-contrast.css` | — | High contrast accessibility theme (WCAG AAA) |

**Token categories:**
- Surfaces: `--tl-bg-app`, `--tl-bg-panel`, `--tl-bg-surface`, `--tl-bg-raised`
- Borders: `--tl-border-faint`, `--tl-border-subtle`, `--tl-border-default`
- Text: `--tl-text-primary`, `--tl-text-secondary`, `--tl-text-tertiary`
- Accent: `--tl-accent`, `--tl-accent-hover`, `--tl-accent-active`
- Semantic: `--tl-color-danger`, `--tl-color-success`, `--tl-color-warning`
- Track types: `--tl-track-video`, `--tl-track-audio`, `--tl-track-subtitle`
- Typography: `--tl-font-sans`, `--tl-font-mono`, `--tl-text-xs` → `--tl-text-xl`
- Spacing: `--tl-space-1` → `--tl-space-8` (4px grid)
- Radius: `--tl-radius-sm`, `--tl-radius-md`, `--tl-radius-lg`
- Shadows: `--tl-shadow-sm`, `--tl-shadow-md`, `--tl-shadow-lg`
- Motion: `--tl-duration-fast`, `--tl-duration-normal`, `--tl-duration-slow`

### 5.3 Shared Utilities

| Utility | Purpose |
|---------|---------|
| `cn` | Classname merging (clsx + tailwind-merge pattern) |
| `clamp` | Number clamping |
| `frameToPx` | Frame → pixel conversion |
| `pxToFrame` | Pixel → frame conversion |
| `frameToTimecode` | Frame → timecode string |
| `rulerTickInterval` | Smart tick interval calculation |
| `getFriendlyTrackLabel` | Human-readable track labels |
| `useTimelineRefs` | Ref management for timeline elements |

---

## 6. @timelinx/media-web — Media Adapters

### 6.1 Adapters (5 files)

| Adapter | Description |
|---------|-------------|
| `WebCodecsDecoderAdapter` | Video decoding via WebCodecs API |
| `WebAudioWaveformAdapter` | Audio waveform extraction via Web Audio API |
| `ThumbnailExtractorAdapter` | Video thumbnail extraction |
| `SimpleExportAdapter` | Basic media export |
| `WebGLCompositorAdapter` | WebGL-based compositing |

### 6.2 Workers (2 files)

| Worker | Description |
|--------|-------------|
| `ThumbnailWorkerClient` | Off-main-thread thumbnail extraction with worker pool + priority queue |
| `WaveformWorkerClient` | Off-main-thread waveform computation with worker pool |

### 6.3 Capability Detection

`isWebCodecsSupported`, `isWebAudioSupported`, `isWebGLSupported`, `isOffscreenCanvasSupported`, `isCaptureStreamSupported`, `getBrowserMediaCapabilities`

---

## 7. @timelinx/ai — AI Suggestions

### 7.1 Types (`types/`)

| Type | Description |
|------|-------------|
| `SuggestedTransaction` | A suggested edit with category, confidence, preview |
| `SuggestionCategory` | `'silence' \| 'scene-change' \| 'caption' \| 'transcript' \| 'command'` |
| `ConfidenceLevel` | `'high' \| 'medium' \| 'low'` |
| `AIAdapter` | Base interface for all AI adapters |
| `TranscriptAdapter` | Speech-to-text |
| `CaptionAdapter` | Caption generation |
| `SceneDetectionAdapter` | Scene change detection |
| `SilenceDetectionAdapter` | Silence detection |
| `NLUAdapter` | Natural language understanding |

### 7.2 Helpers

| File | Purpose |
|------|---------|
| `SuggestionManager` | Workflow: pending → approved/rejected → applied |
| `generateSilenceDeleteSuggestions` | Creates ripple-delete transactions for silence gaps |
| `detectSilence` | Amplitude-based silence detection |
| `generateSceneMarkerSuggestions` | Creates scene-change marker suggestions |
| `detectSceneChanges` | Frame-diff-based scene detection |

### 7.3 Demo Adapters

| Adapter | Description |
|---------|-------------|
| `DemoTranscriptAdapter` | Placeholder transcript generation |
| `DemoNLUAdapter` | Pattern-matching NL command parser (supports: delete, trim, move, caption, marker, split intents) |

---

## 8. @timelinx/collab — Collaboration

### 8.1 Types (`types/index.ts` — 265 lines)

`OperationLogEntry`, `VectorClock`, `Conflict`, `ConflictType`, `ConflictResolution`, `CRDTOperation`, `CRDTState`, `UserPresence`, `CursorPosition`, `UserSelection`, `Comment`, `EditBranch`, `BranchingHistory`, `IStorageAdapter`, `ISyncAdapter`

### 8.2 Stores (5 files)

| Store | Description |
|-------|-------------|
| `OperationLogStore` | Vector clock tracking, happened-before, concurrency detection, merge |
| `BranchingHistoryStore` | Git-like branching, merge, ancestor detection |
| `PresenceManager` | Multi-user cursors, selections, heartbeat, activity detection |
| `CommentManager` | Threaded comments, resolve/unresolve, per-frame/per-track |
| `LocalStorageAdapter` | localStorage-based `IStorageAdapter` implementation |

### 8.3 Sync (2 files)

| Component | Description |
|-----------|-------------|
| `CRDTSyncManager` | Operation-based CRDT, dependency tracking, pending queue, merge, concurrency detection |
| `ConflictResolver` | Detects concurrent-delete/modify/move/order conflicts; LWW/FW/manual/merge resolution strategies |

---

## 9. Testing Infrastructure

### 9.1 Framework & Configuration

- **Framework:** Vitest 2.1.x
- **Config:** `packages/core/vitest.config.ts`
- **Globals:** enabled (no need to import `describe`/`it`/`expect`)
- **Environment:** node
- **Coverage:** v8 provider, text/json/html reporters, thresholds: lines 80%, branches 75%, functions 80%
- **Property-based:** fast-check 4.x

### 9.2 Test Organization (67 test files, ~22K lines)

```
packages/core/src/__tests__/
├── helpers/
│   ├── assertInvariants.ts      # Shared invariant assertion helper
│   ├── buildState.ts            # Composable fixture builders
│   └── arbitraries.ts           # fast-check generators for fuzz testing
├── invariants/
│   └── global.test.ts           # 52 tests — comprehensive invariant checks
├── history/
│   └── undo-redo.test.ts        # 22 tests — undo/redo round-trips
├── fuzz/
│   └── random-sequences.test.ts # 12 tests — property-based fuzz testing
├── operations/
│   └── locked-muted.test.ts     # 17 tests — locked/muted track enforcement
├── serialization/
│   └── roundtrip.test.ts        # 35 tests — JSON/OTIO/EDL/AAF/FCPXML
├── tools/
│   ├── selection.test.ts        # Selection tool tests
│   ├── razor.test.ts            # Razor tool tests
│   ├── ripple-trim.test.ts      # Ripple trim tool tests
│   ├── roll-trim.test.ts        # Roll trim tool tests
│   ├── slip.test.ts             # Slip tool tests
│   ├── slide-tool.test.ts       # Slide tool tests
│   ├── ripple-delete.test.ts    # Ripple delete tool tests
│   ├── ripple-insert.test.ts    # Ripple insert tool tests
│   ├── hand.test.ts             # Hand tool tests
│   ├── keyframe-tool.test.ts    # Keyframe tool tests
│   ├── transition-tool.test.ts  # Transition tool tests
│   └── zoom-tool.test.ts        # Zoom tool tests
├── dispatcher.test.ts           # Dispatcher tests
├── history.test.ts              # Pure history function tests
├── operations.test.ts           # Clip + track operations
├── invariants.test.ts           # Basic invariant tests
├── phase3.test.ts               # Phase 3 features
├── phase4-effects.test.ts       # Effects
├── phase4-transform.test.ts     # Transforms
├── phase4-types.test.ts         # Type tests
├── phase5-*.test.ts             # Serialization (6 files)
├── phase6-*.test.ts             # Playback (5 files)
├── phase7-*.test.ts             # Performance (7 files)
├── snap-index.test.ts           # Snap index
├── provisional.test.ts          # Provisional state
├── registry.test.ts             # Tool registry
├── subtitle-import.test.ts      # SRT/VTT import
├── systems-validation.test.ts   # System validation
└── asset.test.ts                # Asset operations

packages/react/src/__tests__/
├── engine.test.ts               # Engine class
├── hooks.test.ts                # Phase 1 hooks
├── hooks-r2.test.ts             # R2 hooks
├── provider.test.ts             # TimelineProvider
├── playhead-hooks.test.ts       # Playhead hooks
├── integration.test.ts          # Integration
└── tool-router.test.ts          # Tool router

packages/media-web/src/__tests__/  # 5 test files
packages/ai/src/__tests__/         # 1 test file
packages/collab/src/__tests__/     # 1 test file
```

### 9.3 Shared Test Helpers

#### `assertInvariants.ts`

```typescript
import { assertInvariants, assertInvariantViolations, applyAndAssert } from './helpers/assertInvariants';

assertInvariants(state);  // throws on failure
assertInvariantViolations(state, ['OVERLAP', 'ASSET_MISSING']);  // expects specific violations
applyAndAssert(state, transaction);  // dispatch + accept + invariants → next state
```

#### `buildState.ts`

```typescript
import { buildState, buildClip, buildTrack, buildAsset, buildMultiTrackState } from './helpers/buildState';

const state = buildState({ tracks: [buildTrack('v1', 'video', [buildClip('c1', { start: 0, end: 200 })])] });
const multiState = buildMultiTrackState({ tracks: [{ id: 'v1', type: 'video', clips: [{ id: 'c1', start: 0, end: 200 }] }] });
```

#### `arbitraries.ts`

```typescript
import { arbitraryOperation, arbitraryInitialState, resetCounters } from './helpers/arbitraries';

// Generate random operations against a state
fc.assert(fc.property(arbitraryOperation(state), (op) => { /* ... */ }));

// Generate random initial states
fc.assert(fc.property(arbitraryInitialState(), (state) => { /* ... */ }));

// Execute a sequence of ops, asserting invariants after each accepted op
const { state, accepted, rejected } = executeOpsAssertingInvariants(initialState, ops);
```

### 9.4 New Test Suite (138 tests)

The test plan (`docs/timelinx-core-test-plan.md`) was implemented in this session. **138 new tests** across 5 files:

| File | Tests | Coverage |
|------|-------|----------|
| `invariants/global.test.ts` | 52 | Overlap, frame bounds, orphaned refs, duplicate IDs, version monotonicity, duration consistency, ordering, speed, markers, effects, keyframes, schema version, captions, empty state, dispatch integration |
| `history/undo-redo.test.ts` | 22 | Per-operation round-trip, multi-op undo/redo, branching, rejected ops, compression round-trip, invariant preservation |
| `fuzz/random-sequences.test.ts` | 12 | Random op sequences (500 runs each), no overlaps, version monotonicity, rejected ops unchanged, random states, DELETE/MOVE/SPEED/RESIZE fuzz, mixed ops, IN/OUT points, markers |
| `operations/locked-muted.test.ts` | 17 | All ops against locked tracks (MOVE, DELETE, INSERT, GENERATOR, CAPTION rejected; RENAME, DURATION, ADD_TRACK, ASSET, IN/OUT, MARKER allowed), muted behavior documented, unlocked tracks unaffected |
| `serialization/roundtrip.test.ts` | 35 | JSON round-trip (count, effects, transitions, idempotency, empty, generator), asset remapping, OTIO round-trip, EDL export, AAF export, FCPXML export, lossy format documentation |

**Total: 850+ tests across all packages, 138 new from this session.**

### 9.5 Pre-existing Test Files (organized by phase)

**Phase 3:** `phase3.test.ts` — markers, beat grid, generators, captions, in/out points

**Phase 4:** `phase4-effects.test.ts`, `phase4-transform.test.ts`, `phase4-types.test.ts` — effects, keyframes, transitions, clip transforms, link groups, track groups

**Phase 5:** `phase5-serializer.test.ts`, `phase5-roundtrip.test.ts`, `phase5-otio.test.ts`, `phase5-edl.test.ts`, `phase5-aaf.test.ts`, `phase5-project.test.ts`, `phase5-migration.test.ts` — serialization, import/export, migration

**Phase 6:** `phase6-playhead.test.ts`, `phase6-seek.test.ts`, `phase6-loop.test.ts`, `phase6-pipeline.test.ts`, `phase6-keyboard.test.ts` — playback, seeking, looping, pipeline, keyboard

**Phase 7:** `phase7-compression.test.ts`, `phase7-interval-tree.test.ts`, `phase7-snap-manager.test.ts`, `phase7-virtual.test.ts`, `phase7-workers.test.ts`, `phase7-api-surface.test.ts`, `phase7-benchmark.test.ts`, `phase7-invariants-audit.test.ts` — compression, interval tree, snap, virtual windowing, workers, API surface, benchmarks

---

## 10. Key Algorithms

### Binary Search Overlap Detection

Clips are always sorted by `timelineStart`. The invariant checker uses binary search to find the insertion point for a clip, then checks only adjacent clips for overlap. O(log n) instead of O(n).

### Centered Interval Tree

`src/engine/interval-tree.ts` — A centered interval tree for O(log n + k) clip range queries. Given a frame range, returns all clips that overlap that range. Used by `FrameResolver` during playback.

### Transaction Compression

`TransactionCompressor` — Last-write-wins within a 300ms window. When you drag a clip (rapid MOVE_CLIP ops), only the final position is stored in history. Compressible types: MOVE_CLIP, SET_CLIP_TRANSFORM, SET_AUDIO_PROPERTIES, SET_EFFECT_PARAM, MOVE_KEYFRAME, SET_TRANSITION_DURATION, MOVE_MARKER, SET_IN_POINT, SET_OUT_POINT, SET_TRACK_OPACITY.

### Virtual Windowing

`src/engine/virtual-window.ts` — Calculates which frame range is visible in the viewport. Only clips within the visible range (+ overscan) are rendered. Critical for large timelines with thousands of clips.

### Snap Index

`buildSnapIndex()` — Builds a sorted array of snap points from state. Sources: ClipStart, ClipEnd, Playhead, Marker, InPoint, OutPoint, BeatGrid. Each has a priority (100=highest). `findNearestSnap()` uses binary search with priority resolution.

### Rolling-State Validation

In `dispatch()`, each operation in a transaction is validated against the state produced by the previous operation. This allows compound transactions like `[DELETE_CLIP, INSERT_CLIP(left), INSERT_CLIP(right)]` where the INSERT validation must see the post-DELETE state.

---

## 11. Design Principles & Invariants

### Core Principles

1. **Immutable state** — Every operation returns a new state object. Never mutate.
   > **Note on Map immutability:** `Object.freeze()` on `AssetRegistry` (a `Map`) does not prevent
   > `.set()`, `.delete()`, or `.clear()` at runtime — those operate on Map internal slots, not
   > object properties. The `ReadonlyMap` type prevents this at compile time only. Consumers using
   > `as any`/`as unknown` casts or plain JS can still mutate the map at runtime.
2. **Single mutation path** — Only `dispatch()` can change state.
3. **Framework-agnostic core** — No DOM, no React, runs anywhere.
4. **Rolling validation** — Each op validated against previous result.
5. **Branded types** — `TimelineFrame`, `ClipId`, `TrackId` are distinct at compile time.
6. **Zero dependencies** — Core has no runtime dependencies.
7. **Worker-safe** — Core runs in Web Workers, Node.js, Electron.
8. **All-or-nothing transactions** — If one primitive fails, zero primitives are applied.
9. **Deterministic** — Same state + same transaction = same result, always.
10. **Defense in depth** — Three layers: per-primitive validators → operation applier → invariant checker.

### Invariant Contract

After every accepted transaction, the following MUST be true:

- No overlapping clips on the same track
- `timelineStart < timelineEnd` and `mediaIn < mediaOut` for every clip
- All frame values are integers, non-negative
- Every `clip.assetId` points to an existing asset
- Every `clip.trackId` matches the track it's on
- Clip's asset `mediaType` matches track's `type`
- `clip.mediaOut <= asset.intrinsicDuration`
- `clip.timelineEnd <= timeline.duration`
- `(mediaOut - mediaIn)` matches timeline duration accounting for speed
- `clip.speed > 0`
- Clips sorted ascending by `timelineStart` on each track
- All IDs are unique (clips, tracks, markers, assets)
- `timeline.version` is monotonically increasing by exactly 1
- Schema version matches `CURRENT_SCHEMA_VERSION`
- All markers within timeline bounds
- All captions within timeline bounds, no overlaps
- All keyframes sorted by frame within effects
- All effects have valid render stages
- Opacity values in 0-1 range

### Locking Rules

- **Locked track:** All clip edits (MOVE, DELETE, INSERT, INSERT_GENERATOR, ADD_CAPTION) are rejected with `LOCKED_TRACK`
- **Muted track:** Only affects playback, does NOT block mutations
- **Unlocked tracks** are unaffected by adjacent locked tracks

### Schema Versioning

`CURRENT_SCHEMA_VERSION = 2`. The `migrator.ts` handles migration from any previous version. The invariant checker early-returns on schema mismatch (no other checks run). This prevents loading a future schema into an older engine.
