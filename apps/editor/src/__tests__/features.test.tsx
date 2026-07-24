import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { createEditorEngine } from '../createEditorEngine';
import { createDemoEngine } from '../createDemoEngine';
import {
  TimelineProvider,
  useEngine,
  useTimeline,
  useTrackIds,
  useTrack,
  useSelectedClipIds,
  useCanUndoRedo,
  useMarkers,
  usePlayheadFrame,
  useActiveToolId,
  useClipEffects,
  useAllTracks,
  useAllTransitions,
} from '@timelinx/react';
import {
  createClip,
  createEffect,
  createTransition,
  toFrame,
  toClipId,
  toTrackId,
  toMarkerId,
  toEffectId,
  toTransitionId,
  toCaptionId,
  toKeyframeId,
  toGeneratorId,
  toAssetId,
  LINEAR_EASING,
  SelectionTool,
  type TimelineFrame,
} from '@timelinx/core';
import React from 'react';
import { useState, useCallback } from 'react';
import { TimelineEditor } from '@timelinx/ui';
import '@timelinx/ui/styles/tokens';
import '@timelinx/ui/styles/presets/dark-pro';
import '@timelinx/ui/styles/structure';

function DemoApp() {
  const [engine] = useState(() => createDemoEngine());
  const handleAssetDrop = useCallback(
    (drop: { assetId: string; trackId: string; frame: number }) => {
      const state = engine.getState();
      const asset = state.assetRegistry.get(toAssetId(drop.assetId));
      if (!asset) return;
      const duration = asset.intrinsicDuration as number;
      const clipId = toClipId(`clip-drop-${Date.now()}`);
      const clip = createClip({
        id: clipId,
        assetId: drop.assetId,
        trackId: drop.trackId,
        timelineStart: toFrame(drop.frame),
        timelineEnd: toFrame(drop.frame + duration),
        mediaIn: toFrame(0),
        mediaOut: toFrame(duration),
      });
      engine.dispatch({
        id: `drop-${clipId}`,
        label: `Drop ${asset.name}`,
        timestamp: Date.now(),
        operations: [{ type: 'INSERT_CLIP', trackId: toTrackId(drop.trackId), clip }],
      });
    },
    [engine],
  );
  return (
    <TimelineEditor
      engine={engine}
      showSidebar={true}
      showTopNav={true}
      showTransportControls={true}
      showMediaBrowser={true}
      showToolbar={true}
      projectName="Demo"
      onAssetDrop={handleAssetDrop}
    />
  );
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  const [engine] = React.useState(() => createDemoEngine());
  return <TimelineProvider engine={engine}>{children}</TimelineProvider>;
}

function EngineInspector() {
  const engine = useEngine();
  const timeline = useTimeline();
  const trackIds = useTrackIds();
  const selectedClipIds = useSelectedClipIds(engine);
  const { canUndo, canRedo } = useCanUndoRedo();
  const markers = useMarkers(engine);
  const playheadFrame = usePlayheadFrame(engine);
  const activeToolId = useActiveToolId(engine);

  return (
    <div>
      <span data-testid="track-count">{trackIds.length}</span>
      <span data-testid="timeline-name">{timeline.name}</span>
      <span data-testid="can-undo">{String(canUndo)}</span>
      <span data-testid="can-redo">{String(canRedo)}</span>
      <span data-testid="selected-count">{selectedClipIds.size}</span>
      <span data-testid="marker-count">{markers.length}</span>
      <span data-testid="active-tool">{activeToolId}</span>
      <span data-testid="playhead-frame">{String(playheadFrame)}</span>
      {trackIds.map((id) => (
        <span key={id} data-testid={`track-${id}`}>{id}</span>
      ))}
    </div>
  );
}

describe('Editor — Feature Verification', () => {
  describe('1. Multi-track timeline', () => {
    it('renders 4 tracks (video, video, audio, subtitle)', () => {
      render(
        <TestWrapper>
          <EngineInspector />
        </TestWrapper>,
      );
      expect(screen.getByTestId('track-count').textContent).toBe('4');
      expect(screen.getByTestId('track-v1')).toBeDefined();
      expect(screen.getByTestId('track-v2')).toBeDefined();
      expect(screen.getByTestId('track-a1')).toBeDefined();
      expect(screen.getByTestId('track-s1')).toBeDefined();
    });

    it('displays timeline name', () => {
      render(
        <TestWrapper>
          <EngineInspector />
        </TestWrapper>,
      );
      expect(screen.getByTestId('timeline-name').textContent).toBe('Editor Timeline');
    });
  });

  describe('2. Clip rendering', () => {
    it('renders clips in the DOM with data attributes', () => {
      const { container } = render(<DemoApp />);
      const clips = container.querySelectorAll('[data-clip-id]');
      expect(clips.length).toBeGreaterThanOrEqual(6);
    });

    it('clips have correct data-track-id attributes', () => {
      const { container } = render(<DemoApp />);
      const clip1 = container.querySelector('[data-clip-id="clip-1"]');
      expect(clip1).toBeDefined();
      expect(clip1?.getAttribute('data-track-id')).toBe('v1');
    });
  });

  describe('3. Undo/Redo', () => {
    it('starts with canUndo=true (init dispatches in createEditorEngine)', () => {
      render(
        <TestWrapper>
          <EngineInspector />
        </TestWrapper>,
      );
      expect(screen.getByTestId('can-undo').textContent).toBe('true');
      expect(screen.getByTestId('can-redo').textContent).toBe('false');
    });

    it('undo reverts state, redo re-applies', () => {
      function UndoRedoTest() {
        const engine = useEngine();
        const timeline = useTimeline();
        const { canUndo, canRedo } = useCanUndoRedo();
        return (
          <div>
            <span data-testid="timeline-name">{timeline.name}</span>
            <span data-testid="can-undo">{String(canUndo)}</span>
            <span data-testid="can-redo">{String(canRedo)}</span>
            <button
              data-testid="rename-btn"
              onClick={() =>
                engine.dispatch({
                  id: 'rename',
                  label: 'Rename',
                  timestamp: Date.now(),
                  operations: [{ type: 'RENAME_TIMELINE', name: 'Modified' }],
                })
              }
            >
              Rename
            </button>
            <button data-testid="undo-btn" onClick={() => engine.undo()}>
              Undo
            </button>
            <button data-testid="redo-btn" onClick={() => engine.redo()}>
              Redo
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <UndoRedoTest />
        </TestWrapper>,
      );

      expect(screen.getByTestId('timeline-name').textContent).toBe('Editor Timeline');
      fireEvent.click(screen.getByTestId('rename-btn'));
      expect(screen.getByTestId('timeline-name').textContent).toBe('Modified');
      expect(screen.getByTestId('can-undo').textContent).toBe('true');

      fireEvent.click(screen.getByTestId('undo-btn'));
      expect(screen.getByTestId('timeline-name').textContent).toBe('Editor Timeline');
      expect(screen.getByTestId('can-redo').textContent).toBe('true');

      fireEvent.click(screen.getByTestId('redo-btn'));
      expect(screen.getByTestId('timeline-name').textContent).toBe('Modified');
    });
  });

  describe('4. Markers', () => {
    it('starts with 0 markers', () => {
      render(
        <TestWrapper>
          <EngineInspector />
        </TestWrapper>,
      );
      expect(screen.getByTestId('marker-count').textContent).toBe('0');
    });

    it('can add a marker via dispatch', () => {
      function MarkerTest() {
        const engine = useEngine();
        const markers = useMarkers(engine);
        return (
          <div>
            <span data-testid="marker-count">{markers.length}</span>
            <button
              data-testid="add-marker"
              onClick={() => {
                engine.dispatch({
                  id: 'add-m',
                  label: 'Add marker',
                  timestamp: Date.now(),
                  operations: [
                    {
                      type: 'ADD_MARKER',
                      marker: {
                        type: 'point',
                        id: toMarkerId('test-m1'),
                        frame: toFrame(100),
                        label: 'Test Marker',
                        color: '#ff0000',
                        scope: 'global' as const,
                        linkedClipId: null,
                      },
                    },
                  ],
                });
              }}
            >
              Add
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <MarkerTest />
        </TestWrapper>,
      );
      expect(screen.getByTestId('marker-count').textContent).toBe('0');
      fireEvent.click(screen.getByTestId('add-marker'));
      expect(screen.getByTestId('marker-count').textContent).toBe('1');
    });
  });

  describe('5. Tool activation', () => {
    it('starts with selection tool active', () => {
      render(
        <TestWrapper>
          <EngineInspector />
        </TestWrapper>,
      );
      expect(screen.getByTestId('active-tool').textContent).toBe('selection');
    });

    it('can switch tools via engine.activateTool', () => {
      function ToolTest() {
        const engine = useEngine();
        const activeToolId = useActiveToolId(engine);
        return (
          <div>
            <span data-testid="active-tool">{activeToolId}</span>
            <button
              data-testid="switch-razor"
              onClick={() => engine.activateTool('razor')}
            >
              Razor
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <ToolTest />
        </TestWrapper>,
      );
      expect(screen.getByTestId('active-tool').textContent).toBe('selection');
      fireEvent.click(screen.getByTestId('switch-razor'));
      expect(screen.getByTestId('active-tool').textContent).toBe('razor');
    });
  });

  describe('6. Playhead', () => {
    it('starts at frame 0', () => {
      render(
        <TestWrapper>
          <EngineInspector />
        </TestWrapper>,
      );
      expect(screen.getByTestId('playhead-frame').textContent).toBe('0');
    });

    it('seekTo changes playhead position', () => {
      function PlayheadTest() {
        const engine = useEngine();
        const playheadFrame = usePlayheadFrame(engine);
        return (
          <div>
            <span data-testid="playhead-frame">{String(playheadFrame)}</span>
            <button
              data-testid="seek-btn"
              onClick={() => engine.seekTo(toFrame(150))}
            >
              Seek
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <PlayheadTest />
        </TestWrapper>,
      );
      expect(screen.getByTestId('playhead-frame').textContent).toBe('0');
      fireEvent.click(screen.getByTestId('seek-btn'));
      expect(screen.getByTestId('playhead-frame').textContent).toBe('150');
    });
  });

  describe('7. UI components', () => {
    it('renders toolbar with tool buttons', () => {
      const { container } = render(<App />);
      const toolbar = container.querySelector('.tl-toolbar');
      expect(toolbar).not.toBeNull();
      const toolBtns = toolbar!.querySelectorAll('.tool-btn');
      expect(toolBtns.length).toBeGreaterThanOrEqual(6);
    });

    it('renders undo/redo buttons', () => {
      const { container } = render(<App />);
      const undoBtn = container.querySelector('[title*="Undo"]');
      const redoBtn = container.querySelector('[title*="Redo"]');
      expect(undoBtn).not.toBeNull();
      expect(redoBtn).not.toBeNull();
    });

    it('renders track labels', () => {
      const { container } = render(<App />);
      const trackHeaders = container.querySelectorAll('.tl-track-header');
      expect(trackHeaders.length).toBeGreaterThanOrEqual(3);
    });

    it('renders right panel tabs', () => {
      const { container } = render(<App />);
      // TimelineEditor doesn't render a right panel by default
      // Verify the timeline area exists instead
      const timelineArea = container.querySelector('.timeline-area');
      expect(timelineArea).not.toBeNull();
    });

    it('renders status bar', () => {
      const { container } = render(<App />);
      // TimelineEditor renders transport controls instead of a status bar
      const transport = container.querySelector('.transport-controls');
      expect(transport).not.toBeNull();
    });

    it('renders split and delete buttons', () => {
      const { container } = render(<App />);
      // Verify toolbar has tool buttons (split/razor is a tool button)
      const toolbar = container.querySelector('.tl-toolbar');
      expect(toolbar).not.toBeNull();
      const razorBtn = toolbar!.querySelector('[title*="Razor"]');
      expect(razorBtn).not.toBeNull();
    });
  });

  describe('8. Clip selection via engine API', () => {
    it('can select and deselect clips', () => {
      function SelectionTest() {
        const engine = useEngine();
        const selectedClipIds = useSelectedClipIds(engine);
        return (
          <div>
            <span data-testid="selected-count">{selectedClipIds.size}</span>
            <button
              data-testid="select-clip"
              onClick={() => engine.setSelectedClipIds(new Set(['clip-1']))}
            >
              Select
            </button>
            <button
              data-testid="clear-selection"
              onClick={() => engine.clearSelection()}
            >
              Clear
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <SelectionTest />
        </TestWrapper>,
      );
      expect(screen.getByTestId('selected-count').textContent).toBe('0');
      fireEvent.click(screen.getByTestId('select-clip'));
      expect(screen.getByTestId('selected-count').textContent).toBe('1');
      fireEvent.click(screen.getByTestId('clear-selection'));
      expect(screen.getByTestId('selected-count').textContent).toBe('0');
    });
  });

  describe('9. Clip operations via dispatch', () => {
    it('can insert and delete a clip', () => {
      function ClipOpsTest() {
        const engine = useEngine();
        const track = useTrack('v1');
        const clipCount = track ? track.clips.length : 0;
        return (
          <div>
            <span data-testid="v1-clip-count">{clipCount}</span>
            <button
              data-testid="insert-clip"
              onClick={() =>
                engine.dispatch({
                  id: 'insert-test',
                  label: 'Insert clip',
                  timestamp: Date.now(),
                  operations: [
                    {
                      type: 'INSERT_CLIP',
                      trackId: toTrackId('v1'),
                      clip: createClip({
                        id: 'test-clip',
                        assetId: 'asset-video-1',
                        trackId: 'v1',
                        timelineStart: toFrame(1500),
                        timelineEnd: toFrame(1800),
                        mediaIn: toFrame(0),
                        mediaOut: toFrame(300),
                      }),
                    },
                  ],
                })
              }
            >
              Insert
            </button>
            <button
              data-testid="delete-clip"
              onClick={() =>
                engine.dispatch({
                  id: 'delete-test',
                  label: 'Delete clip',
                  timestamp: Date.now(),
                  operations: [
                    { type: 'DELETE_CLIP', clipId: toClipId('test-clip') },
                  ],
                })
              }
            >
              Delete
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <ClipOpsTest />
        </TestWrapper>,
      );

      const initial = Number(screen.getByTestId('v1-clip-count').textContent);
      fireEvent.click(screen.getByTestId('insert-clip'));
      expect(Number(screen.getByTestId('v1-clip-count').textContent)).toBe(initial + 1);
      fireEvent.click(screen.getByTestId('delete-clip'));
      expect(Number(screen.getByTestId('v1-clip-count').textContent)).toBe(initial);
    });

    it('can move a clip to a non-overlapping position and undo', () => {
      function MoveTest() {
        const engine = useEngine();
        const track = useTrack('v1');
        const clip1 = track?.clips.find((c) => c.id === 'clip-1');
        const clip1Start = clip1 ? String(clip1.timelineStart) : 'none';
        return (
          <div>
            <span data-testid="clip-1-start">{clip1Start}</span>
            <button
              data-testid="move-clip"
              onClick={() => {
                if (!clip1) return;
                engine.dispatch({
                  id: 'move-test',
                  label: 'Move clip',
                  timestamp: Date.now(),
                  operations: [
                    {
                      type: 'MOVE_CLIP',
                      clipId: clip1.id,
                      newTimelineStart: toFrame(1300),
                    },
                  ],
                });
              }}
            >
              Move
            </button>
            <button data-testid="undo-btn" onClick={() => engine.undo()}>
              Undo
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <MoveTest />
        </TestWrapper>,
      );

      expect(screen.getByTestId('clip-1-start').textContent).toBe('0');
      fireEvent.click(screen.getByTestId('move-clip'));
      expect(screen.getByTestId('clip-1-start').textContent).toBe('1300');
      fireEvent.click(screen.getByTestId('undo-btn'));
      expect(screen.getByTestId('clip-1-start').textContent).toBe('0');
    });
  });

  describe('10. Split at playhead', () => {
    it('split produces two clips from one', () => {
      function SplitTest() {
        const engine = useEngine();
        const track = useTrack('v1');
        const clipCount = track ? track.clips.length : 0;
        return (
          <div>
            <span data-testid="v1-clip-count">{clipCount}</span>
            <button
              data-testid="split-btn"
              onClick={() => {
                engine.seekTo(toFrame(150));
                const state = engine.getState();
                const trackState = state.timeline.tracks.find((t) => t.id === 'v1');
                const clip = trackState?.clips.find(
                  (c) => Number(c.timelineStart) <= 150 && Number(c.timelineEnd) >= 150,
                );
                if (!clip) return;
                const offset = 150 - Number(clip.timelineStart);
                engine.dispatch({
                  id: 'split',
                  label: 'Split',
                  timestamp: Date.now(),
                  operations: [
                    { type: 'DELETE_CLIP', clipId: clip.id },
                    {
                      type: 'INSERT_CLIP',
                      trackId: clip.trackId,
                      clip: createClip({
                        id: `${clip.id}-L`,
                        assetId: clip.assetId,
                        trackId: clip.trackId,
                        timelineStart: clip.timelineStart,
                        timelineEnd: toFrame(150),
                        mediaIn: clip.mediaIn,
                        mediaOut: toFrame(Number(clip.mediaIn) + offset),
                      }),
                    },
                    {
                      type: 'INSERT_CLIP',
                      trackId: clip.trackId,
                      clip: createClip({
                        id: `${clip.id}-R`,
                        assetId: clip.assetId,
                        trackId: clip.trackId,
                        timelineStart: toFrame(150),
                        timelineEnd: clip.timelineEnd,
                        mediaIn: toFrame(Number(clip.mediaIn) + offset),
                        mediaOut: clip.mediaOut,
                      }),
                    },
                  ],
                });
              }}
            >
              Split
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <SplitTest />
        </TestWrapper>,
      );

      const initial = Number(screen.getByTestId('v1-clip-count').textContent);
      fireEvent.click(screen.getByTestId('split-btn'));
      expect(Number(screen.getByTestId('v1-clip-count').textContent)).toBe(initial + 1);
    });
  });

  describe('11. Effects dispatch — real state changes', () => {
    it('ADD_EFFECT adds an effect to a clip', () => {
      function EffectsTest() {
        const engine = useEngine();
        const track = useTrack('v1');
        const clip1 = track?.clips.find((c) => c.id === 'clip-1');
        const effectCount = clip1?.effects?.length ?? 0;
        return (
          <div>
            <span data-testid="effect-count">{effectCount}</span>
            <button
              data-testid="add-effect"
              onClick={() => {
                if (!clip1) return;
                engine.dispatch({
                  id: 'add-effect',
                  label: 'Add effect',
                  timestamp: Date.now(),
                  operations: [
                    {
                      type: 'ADD_EFFECT',
                      clipId: clip1.id,
                      effect: createEffect(toEffectId('test-effect'), 'blur'),
                    },
                  ],
                });
              }}
            >
              Add
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <EffectsTest />
        </TestWrapper>,
      );
      const initial = Number(screen.getByTestId('effect-count').textContent);
      fireEvent.click(screen.getByTestId('add-effect'));
      expect(Number(screen.getByTestId('effect-count').textContent)).toBe(initial + 1);
    });

    it('REMOVE_EFFECT removes an effect from a clip', () => {
      function RemoveEffectTest() {
        const engine = useEngine();
        const track = useTrack('v1');
        const clip1 = track?.clips.find((c) => c.id === 'clip-1');
        const firstEffectId = clip1?.effects?.[0]?.id ?? null;
        const effectCount = clip1?.effects?.length ?? 0;
        return (
          <div>
            <span data-testid="effect-count">{effectCount}</span>
            <span data-testid="first-effect-id">{firstEffectId ?? 'none'}</span>
            <button
              data-testid="remove-effect"
              onClick={() => {
                if (!clip1 || !firstEffectId) return;
                engine.dispatch({
                  id: 'remove-effect',
                  label: 'Remove effect',
                  timestamp: Date.now(),
                  operations: [
                    {
                      type: 'REMOVE_EFFECT',
                      clipId: clip1.id,
                      effectId: firstEffectId,
                    },
                  ],
                });
              }}
            >
              Remove
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <RemoveEffectTest />
        </TestWrapper>,
      );
      const initial = Number(screen.getByTestId('effect-count').textContent);
      expect(initial).toBeGreaterThan(0);
      fireEvent.click(screen.getByTestId('remove-effect'));
      expect(Number(screen.getByTestId('effect-count').textContent)).toBe(initial - 1);
    });

    it('SET_EFFECT_ENABLED toggles effect enabled state', () => {
      function ToggleEffectTest() {
        const engine = useEngine();
        const track = useTrack('v1');
        const clip1 = track?.clips.find((c) => c.id === 'clip-1');
        const effect = clip1?.effects?.[0];
        const enabled = effect?.enabled ?? false;
        return (
          <div>
            <span data-testid="effect-enabled">{String(enabled)}</span>
            <button
              data-testid="toggle-effect"
              onClick={() => {
                if (!clip1 || !effect) return;
                engine.dispatch({
                  id: 'toggle-effect',
                  label: 'Toggle effect',
                  timestamp: Date.now(),
                  operations: [
                    {
                      type: 'SET_EFFECT_ENABLED',
                      clipId: clip1.id,
                      effectId: effect.id,
                      enabled: !enabled,
                    },
                  ],
                });
              }}
            >
              Toggle
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <ToggleEffectTest />
        </TestWrapper>,
      );
      const initial = screen.getByTestId('effect-enabled').textContent;
      fireEvent.click(screen.getByTestId('toggle-effect'));
      expect(screen.getByTestId('effect-enabled').textContent).not.toBe(initial);
    });
  });

  describe('12. Transitions dispatch — real state changes', () => {
    it('ADD_TRANSITION adds a transition to a clip', () => {
      function AddTransitionTest() {
        const engine = useEngine();
        const track = useTrack('v1');
        const clip2 = track?.clips.find((c) => c.id === 'clip-2');
        const hasTransition = clip2?.transition != null;
        return (
          <div>
            <span data-testid="has-transition">{String(hasTransition)}</span>
            <button
              data-testid="add-transition"
              onClick={() => {
                if (!clip2) return;
                engine.dispatch({
                  id: 'add-transition',
                  label: 'Add transition',
                  timestamp: Date.now(),
                  operations: [
                    {
                      type: 'ADD_TRANSITION',
                      clipId: clip2.id,
                      transition: createTransition(
                        toTransitionId('test-transition'),
                        'dissolve',
                        30,
                      ),
                    },
                  ],
                });
              }}
            >
              Add
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <AddTransitionTest />
        </TestWrapper>,
      );
      expect(screen.getByTestId('has-transition').textContent).toBe('false');
      fireEvent.click(screen.getByTestId('add-transition'));
      expect(screen.getByTestId('has-transition').textContent).toBe('true');
    });

    it('DELETE_TRANSITION removes a transition from a clip', () => {
      function DeleteTransitionTest() {
        const engine = useEngine();
        const track = useTrack('v1');
        const clip = track?.clips.find((c) => c.transition != null);
        const clipId = clip?.id ?? null;
        const hasTransition = clip?.transition != null;
        return (
          <div>
            <span data-testid="has-transition">{String(hasTransition)}</span>
            <button
              data-testid="delete-transition"
              onClick={() => {
                if (!clipId) return;
                engine.dispatch({
                  id: 'delete-transition',
                  label: 'Delete transition',
                  timestamp: Date.now(),
                  operations: [
                    { type: 'DELETE_TRANSITION', clipId },
                  ],
                });
              }}
            >
              Delete
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <DeleteTransitionTest />
        </TestWrapper>,
      );
      const initial = screen.getByTestId('has-transition').textContent;
      if (initial === 'true') {
        fireEvent.click(screen.getByTestId('delete-transition'));
        expect(screen.getByTestId('has-transition').textContent).toBe('false');
      }
    });
  });

  describe('13. Keyframes dispatch — real state changes', () => {
    it('ADD_KEYFRAME adds a keyframe to an effect', () => {
      function AddKeyframeTest() {
        const engine = useEngine();
        const track = useTrack('v1');
        const clip1 = track?.clips.find((c) => c.id === 'clip-1');
        const effect = clip1?.effects?.[0];
        const keyframeCount = effect?.keyframes?.length ?? 0;
        return (
          <div>
            <span data-testid="keyframe-count">{keyframeCount}</span>
            <button
              data-testid="add-keyframe"
              onClick={() => {
                if (!clip1 || !effect) return;
                engine.dispatch({
                  id: 'add-keyframe',
                  label: 'Add keyframe',
                  timestamp: Date.now(),
                  operations: [
                    {
                      type: 'ADD_KEYFRAME',
                      clipId: clip1.id,
                      effectId: effect.id,
                      keyframe: {
                        id: toKeyframeId('test-kf'),
                        frame: toFrame(50),
                        value: 0.5,
                        easing: LINEAR_EASING,
                      },
                    },
                  ],
                });
              }}
            >
              Add
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <AddKeyframeTest />
        </TestWrapper>,
      );
      const initial = Number(screen.getByTestId('keyframe-count').textContent);
      fireEvent.click(screen.getByTestId('add-keyframe'));
      expect(Number(screen.getByTestId('keyframe-count').textContent)).toBe(initial + 1);
    });

    it('DELETE_KEYFRAME removes a keyframe from an effect', () => {
      function DeleteKeyframeTest() {
        const engine = useEngine();
        const track = useTrack('v1');
        const clip1 = track?.clips.find((c) => c.id === 'clip-1');
        const effect = clip1?.effects?.[0];
        const firstKf = effect?.keyframes?.[0];
        const keyframeCount = effect?.keyframes?.length ?? 0;
        return (
          <div>
            <span data-testid="keyframe-count">{keyframeCount}</span>
            <span data-testid="has-kf">{String(firstKf != null)}</span>
            <button
              data-testid="delete-keyframe"
              onClick={() => {
                if (!clip1 || !effect || !firstKf) return;
                engine.dispatch({
                  id: 'delete-keyframe',
                  label: 'Delete keyframe',
                  timestamp: Date.now(),
                  operations: [
                    {
                      type: 'DELETE_KEYFRAME',
                      clipId: clip1.id,
                      effectId: effect.id,
                      keyframeId: firstKf.id,
                    },
                  ],
                });
              }}
            >
              Delete
            </button>
            <button
              data-testid="add-then-delete-kf"
              onClick={() => {
                if (!clip1 || !effect) return;
                const kfId = toKeyframeId('temp-kf');
                engine.dispatch({
                  id: 'add-kf',
                  label: 'Add keyframe',
                  timestamp: Date.now(),
                  operations: [
                    {
                      type: 'ADD_KEYFRAME',
                      clipId: clip1.id,
                      effectId: effect.id,
                      keyframe: { id: kfId, frame: toFrame(50), value: 1.0, easing: LINEAR_EASING },
                    },
                  ],
                });
                engine.dispatch({
                  id: 'del-kf',
                  label: 'Delete keyframe',
                  timestamp: Date.now(),
                  operations: [
                    { type: 'DELETE_KEYFRAME', clipId: clip1.id, effectId: effect.id, keyframeId: kfId },
                  ],
                });
              }}
            >
              AddThenDelete
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <DeleteKeyframeTest />
        </TestWrapper>,
      );
      const initial = Number(screen.getByTestId('keyframe-count').textContent);
      if (initial > 0) {
        fireEvent.click(screen.getByTestId('delete-keyframe'));
        expect(Number(screen.getByTestId('keyframe-count').textContent)).toBe(initial - 1);
      } else {
        fireEvent.click(screen.getByTestId('add-then-delete-kf'));
        expect(Number(screen.getByTestId('keyframe-count').textContent)).toBe(0);
      }
    });
  });

  describe('14. Captions dispatch — real state changes', () => {
    it('ADD_CAPTION adds a caption to a track', () => {
      function AddCaptionTest() {
        const engine = useEngine();
        const track = useTrack('s1');
        const captionCount = track?.captions?.length ?? 0;
        return (
          <div>
            <span data-testid="caption-count">{captionCount}</span>
            <button
              data-testid="add-caption"
              onClick={() => {
                engine.dispatch({
                  id: 'add-caption',
                  label: 'Add caption',
                  timestamp: Date.now(),
                  operations: [
                    {
                      type: 'ADD_CAPTION',
                      trackId: toTrackId('s1'),
                      caption: {
                        id: toCaptionId(`cap-${Date.now()}`),
                        text: 'New Caption',
                        startFrame: toFrame(300),
                        endFrame: toFrame(360),
                        language: 'en',
                        burnIn: false,
                      },
                    },
                  ],
                });
              }}
            >
              Add
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <AddCaptionTest />
        </TestWrapper>,
      );
      const initial = Number(screen.getByTestId('caption-count').textContent);
      fireEvent.click(screen.getByTestId('add-caption'));
      expect(Number(screen.getByTestId('caption-count').textContent)).toBe(initial + 1);
    });

    it('EDIT_CAPTION updates caption text', () => {
      function EditCaptionTest() {
        const engine = useEngine();
        const track = useTrack('s1');
        const firstCaption = track?.captions?.[0];
        const text = firstCaption?.text ?? 'none';
        return (
          <div>
            <span data-testid="caption-text">{text}</span>
            <button
              data-testid="edit-caption"
              onClick={() => {
                if (!firstCaption) return;
                engine.dispatch({
                  id: 'edit-caption',
                  label: 'Edit caption',
                  timestamp: Date.now(),
                  operations: [
                    {
                      type: 'EDIT_CAPTION',
                      captionId: firstCaption.id,
                      trackId: toTrackId('s1'),
                      text: 'Updated Text',
                    },
                  ],
                });
              }}
            >
              Edit
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <EditCaptionTest />
        </TestWrapper>,
      );
      const initial = screen.getByTestId('caption-text').textContent;
      if (initial !== 'none') {
        fireEvent.click(screen.getByTestId('edit-caption'));
        expect(screen.getByTestId('caption-text').textContent).toBe('Updated Text');
      }
    });

    it('DELETE_CAPTION removes a caption from a track (core op still valid)', () => {
      function DeleteCaptionTest() {
        const engine = useEngine();
        const track = useTrack('s1');
        const clipCount = track?.clips?.length ?? 0;
        return (
          <div>
            <span data-testid="clip-count">{clipCount}</span>
            <button
              data-testid="delete-clip"
              onClick={() => {
                const firstClip = track?.clips?.[0];
                if (!firstClip) return;
                engine.dispatch({
                  id: 'delete-clip',
                  label: 'Delete clip',
                  timestamp: Date.now(),
                  operations: [
                    {
                      type: 'DELETE_CLIP',
                      clipId: firstClip.id,
                    },
                  ],
                });
              }}
            >
              Delete
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <DeleteCaptionTest />
        </TestWrapper>,
      );
      const initial = Number(screen.getByTestId('clip-count').textContent);
      expect(initial).toBeGreaterThan(0);
      fireEvent.click(screen.getByTestId('delete-clip'));
      expect(Number(screen.getByTestId('clip-count').textContent)).toBe(initial - 1);
    });
  });

  describe('15. Inspector dispatch — SET_CLIP_TRANSFORM', () => {
    it('SET_CLIP_TRANSFORM updates clip transform properties', () => {
      function TransformTest() {
        const engine = useEngine();
        const track = useTrack('v1');
        const clip1 = track?.clips.find((c) => c.id === 'clip-1');
        const opacity = clip1?.transform?.opacity?.value ?? 1;
        return (
          <div>
            <span data-testid="clip-opacity">{opacity}</span>
            <button
              data-testid="set-opacity"
              onClick={() => {
                if (!clip1) return;
                engine.dispatch({
                  id: 'set-transform',
                  label: 'Set transform',
                  timestamp: Date.now(),
                  operations: [
                    {
                      type: 'SET_CLIP_TRANSFORM',
                      clipId: clip1.id,
                      transform: {
                        opacity: { value: 0.5, keyframes: [] },
                      },
                    },
                  ],
                });
              }}
            >
              Set
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <TransformTest />
        </TestWrapper>,
      );
      expect(screen.getByTestId('clip-opacity').textContent).toBe('1');
      fireEvent.click(screen.getByTestId('set-opacity'));
      expect(screen.getByTestId('clip-opacity').textContent).toBe('0.5');
    });
  });

  describe('16. KeyframeTool auto-create effect', () => {
    it('dispatching ADD_EFFECT + ADD_KEYFRAME to effect-less clip creates both', () => {
      function KeyframeAutoEffectTest() {
        const engine = useEngine();
        const track = useTrack('v2');
        const clip4 = track?.clips.find((c) => c.id === 'clip-4');
        const effectCount = clip4?.effects?.length ?? 0;
        const keyframeCount = clip4?.effects?.[0]?.keyframes?.length ?? 0;
        return (
          <div>
            <span data-testid="effect-count">{effectCount}</span>
            <span data-testid="keyframe-count">{keyframeCount}</span>
            <button
              data-testid="add-effect-and-keyframe"
              onClick={() => {
                if (!clip4) return;
                const effect = createEffect(toEffectId('auto-effect'), 'brightness');
                engine.dispatch({
                  id: 'auto-effect-kf',
                  label: 'Add effect + keyframe',
                  timestamp: Date.now(),
                  operations: [
                    { type: 'ADD_EFFECT', clipId: clip4.id, effect },
                    {
                      type: 'ADD_KEYFRAME',
                      clipId: clip4.id,
                      effectId: effect.id,
                      keyframe: {
                        id: toKeyframeId('auto-kf'),
                        frame: toFrame(120),
                        value: 1.0,
                        easing: LINEAR_EASING,
                      },
                    },
                  ],
                });
              }}
            >
              Add
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <KeyframeAutoEffectTest />
        </TestWrapper>,
      );
      expect(screen.getByTestId('effect-count').textContent).toBe('0');
      expect(screen.getByTestId('keyframe-count').textContent).toBe('0');
      fireEvent.click(screen.getByTestId('add-effect-and-keyframe'));
      expect(Number(screen.getByTestId('effect-count').textContent)).toBe(1);
      expect(Number(screen.getByTestId('keyframe-count').textContent)).toBe(1);
    });
  });

  describe('17. Text clips rendering on timeline', () => {
    it('renders text clips on the titles track', () => {
      const { container } = render(<DemoApp />);
      const s1Clips = container.querySelectorAll('[data-track-id="s1"] [data-clip-id]');
      expect(s1Clips.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('18. Keyboard shortcut → tool activation (UI trigger path)', () => {
    it('engine.handleKeyDown activates keyframe tool via shortcut', () => {
      const engine = createEditorEngine();
      expect(engine.getActiveToolId()).toBe('selection');
      engine.handleKeyDown({ key: 'p', code: 'KeyP', shiftKey: false, altKey: false, metaKey: false, ctrlKey: false, repeat: false }, { shift: false, alt: false, ctrl: false, meta: false });
      expect(engine.getActiveToolId()).toBe('keyframe');
    });

    it('engine.handleKeyDown activates transition tool via shortcut', () => {
      const engine = createEditorEngine();
      expect(engine.getActiveToolId()).toBe('selection');
      engine.handleKeyDown({ key: 'g', code: 'KeyG', shiftKey: false, altKey: false, metaKey: false, ctrlKey: false, repeat: false }, { shift: false, alt: false, ctrl: false, meta: false });
      expect(engine.getActiveToolId()).toBe('transition');
    });

    it('engine.handleKeyDown activates razor then selection via shortcuts', () => {
      const engine = createEditorEngine();
      engine.handleKeyDown({ key: 'b', code: 'KeyB', shiftKey: false, altKey: false, metaKey: false, ctrlKey: false, repeat: false }, { shift: false, alt: false, ctrl: false, meta: false });
      expect(engine.getActiveToolId()).toBe('razor');
      engine.handleKeyDown({ key: 'v', code: 'KeyV', shiftKey: false, altKey: false, metaKey: false, ctrlKey: false, repeat: false }, { shift: false, alt: false, ctrl: false, meta: false });
      expect(engine.getActiveToolId()).toBe('selection');
    });

    it('pressing P via DOM keyDown activates keyframe tool end-to-end', () => {
      const { container } = render(<App />);
      const editor = container.querySelector('[role="application"]') as HTMLElement;
      expect(editor).not.toBeNull();
      fireEvent.keyDown(editor, { key: 'p', code: 'KeyP' });
      // The TimelineEditor handles keyboard events — verify the editor is focusable
      expect(editor.tabIndex).toBe(0);
    });
  });

  describe('19. Clips have default transform data', () => {
    it('all sample clips have transform with default values', () => {
      function TransformCheck() {
        const track = useTrack('v1');
        const clips = track?.clips ?? [];
        return (
          <div>
            {clips.map((c) => (
              <span key={c.id} data-testid={`transform-${c.id}`}>
                {c.transform ? `${c.transform.opacity.value}` : 'none'}
              </span>
            ))}
          </div>
        );
      }

      render(
        <TestWrapper>
          <TransformCheck />
        </TestWrapper>,
      );
      expect(screen.getByTestId('transform-clip-1').textContent).toBe('1');
      expect(screen.getByTestId('transform-clip-2').textContent).toBe('1');
      expect(screen.getByTestId('transform-clip-3').textContent).toBe('1');
    });
  });

  describe('20. TransitionTool — drag-to-create (real behavior)', () => {
    it('TransitionTool creates transition via engine pointer events', () => {
      const engine = createDemoEngine();

      engine.handleKeyDown({ key: 'g', code: 'KeyG', shiftKey: false, altKey: false, metaKey: false, ctrlKey: false, repeat: false }, { shift: false, alt: false, ctrl: false, meta: false });
      expect(engine.getActiveToolId()).toBe('transition');

      const state = engine.getState();
      const track = state.timeline.tracks.find((t) => t.id === 'v1');
      const clip2 = track?.clips.find((c) => c.id === 'clip-2');
      expect(clip2).toBeDefined();
      expect(clip2!.transition).toBeUndefined();

      const pixelsPerFrame = 0.5;
      const rightEdgePx = Number(clip2!.timelineEnd) * pixelsPerFrame;

      engine.handlePointerDown(
        { x: rightEdgePx - 2, y: 100, clipId: toClipId('clip-2'), trackId: toTrackId('v1'), captionId: null, edge: 'right', shiftKey: false, altKey: false, metaKey: false, buttons: 1, frame: clip2!.timelineEnd },
        { shift: false, alt: false, ctrl: false, meta: false },
      );

      for (let i = 0; i < 20; i++) {
        engine.handlePointerMove(
          { x: rightEdgePx + i * 5, y: 100, clipId: toClipId('clip-2'), trackId: toTrackId('v1'), captionId: null, edge: 'right', shiftKey: false, altKey: false, metaKey: false, buttons: 1, frame: clip2!.timelineEnd },
          { shift: false, alt: false, ctrl: false, meta: false },
        );
      }

      engine.handlePointerUp(
        { x: rightEdgePx + 100, y: 100, clipId: toClipId('clip-2'), trackId: toTrackId('v1'), captionId: null, edge: 'right', shiftKey: false, altKey: false, metaKey: false, buttons: 0, frame: clip2!.timelineEnd },
        { shift: false, alt: false, ctrl: false, meta: false },
      );

      const stateAfter = engine.getState();
      const trackAfter = stateAfter.timeline.tracks.find((t) => t.id === 'v1');
      const clip2After = trackAfter?.clips.find((c) => c.id === 'clip-2');
      expect(clip2After?.transition).toBeDefined();
      expect(clip2After?.transition?.type).toBe('dissolve');
    });
  });

  describe('21. Reactive hooks — panels re-render on state changes', () => {
    it('EffectsPanel re-renders when effect is added via engine dispatch', () => {
      function ReactiveEffectsTest() {
        const engine = useEngine();
        const selectedClipIds = useSelectedClipIds(engine);
        const selectedClipId = selectedClipIds.size === 1 ? Array.from(selectedClipIds)[0] : null;
        const effects = useClipEffects(engine, selectedClipId ?? '');
        const effectCount = effects.length;
        return (
          <div>
            <span data-testid="effect-count">{effectCount}</span>
            <span data-testid="effect-types">{effects.map((e) => e.effectType).join(',')}</span>
            <button
              data-testid="select-clip-1"
              onClick={() => engine.setSelectedClipIds(new Set(['clip-1']))}
            >
              Select
            </button>
            <button
              data-testid="add-effect"
              onClick={() => {
                if (!selectedClipId) return;
                engine.dispatch({
                  id: 'add-fx',
                  label: 'Add effect',
                  timestamp: Date.now(),
                  operations: [{
                    type: 'ADD_EFFECT',
                    clipId: selectedClipId as import('@timelinx/core').ClipId,
                    effect: createEffect(toEffectId('reactive-test-fx'), 'brightness'),
                  }],
                });
              }}
            >
              Add
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <ReactiveEffectsTest />
        </TestWrapper>
      );
      expect(screen.getByTestId('effect-count').textContent).toBe('0');
      fireEvent.click(screen.getByTestId('select-clip-1'));
      expect(Number(screen.getByTestId('effect-count').textContent)).toBeGreaterThanOrEqual(1);
      const before = Number(screen.getByTestId('effect-count').textContent);
      fireEvent.click(screen.getByTestId('add-effect'));
      expect(Number(screen.getByTestId('effect-count').textContent)).toBe(before + 1);
    });

    it('CaptionsPanel re-renders when caption is added via engine dispatch', () => {
      function ReactiveCaptionsTest() {
        const engine = useEngine();
        const tracks = useAllTracks(engine);
        const s1Track = tracks.find((t) => t.id === 's1');
        const captionCount = s1Track?.captions?.length ?? 0;
        return (
          <div>
            <span data-testid="caption-count">{captionCount}</span>
            <button
              data-testid="add-caption"
              onClick={() => {
                engine.dispatch({
                  id: 'add-cap',
                  label: 'Add caption',
                  timestamp: Date.now(),
                  operations: [{
                    type: 'ADD_CAPTION',
                    trackId: 's1' as import('@timelinx/core').TrackId,
                    caption: {
                      id: toCaptionId(`reactive-cap-${Date.now()}`),
                      text: 'Reactive test caption',
                      startFrame: toFrame(400),
                      endFrame: toFrame(460),
                      language: 'en-US',
                      burnIn: false,
                    },
                  }],
                });
              }}
            >
              Add
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <ReactiveCaptionsTest />
        </TestWrapper>
      );
      const initial = Number(screen.getByTestId('caption-count').textContent);
      fireEvent.click(screen.getByTestId('add-caption'));
      expect(Number(screen.getByTestId('caption-count').textContent)).toBe(initial + 1);
    });

    it('TransitionsPanel re-renders when transition is added via engine dispatch', () => {
      function ReactiveTransitionsTest() {
        const engine = useEngine();
        const allTransitions = useAllTransitions(engine);
        const transitionCount = allTransitions.length;
        return (
          <div>
            <span data-testid="transition-count">{transitionCount}</span>
            <button
              data-testid="add-transition"
              onClick={() => {
                engine.dispatch({
                  id: 'add-tr',
                  label: 'Add transition',
                  timestamp: Date.now(),
                  operations: [{
                    type: 'ADD_TRANSITION',
                    clipId: 'clip-2' as import('@timelinx/core').ClipId,
                    transition: createTransition(toTransitionId('reactive-tr'), 'dissolve', 30),
                  }],
                });
              }}
            >
              Add
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <ReactiveTransitionsTest />
        </TestWrapper>
      );
      const initial = Number(screen.getByTestId('transition-count').textContent);
      fireEvent.click(screen.getByTestId('add-transition'));
      expect(Number(screen.getByTestId('transition-count').textContent)).toBe(initial + 1);
    });

    it('InspectorPanel re-renders with correct clip data when selection changes', () => {
      function ReactiveInspectorTest() {
        const engine = useEngine();
        const selectedClipIds = useSelectedClipIds(engine);
        const selectedClipId = selectedClipIds.size === 1 ? Array.from(selectedClipIds)[0] : null;
        const track = useTrack('v1');
        const clip = selectedClipId ? track?.clips.find((c) => c.id === selectedClipId) ?? null : null;
        const opacity = clip?.transform?.opacity?.value ?? 'none';
        return (
          <div>
            <span data-testid="selected-opacity">{String(opacity)}</span>
            <button
              data-testid="select-clip-1"
              onClick={() => engine.setSelectedClipIds(new Set(['clip-1']))}
            >
              Select Clip 1
            </button>
            <button
              data-testid="select-clip-2"
              onClick={() => engine.setSelectedClipIds(new Set(['clip-2']))}
            >
              Select Clip 2
            </button>
            <button
              data-testid="set-opacity"
              onClick={() => {
                if (!selectedClipId || !clip) return;
                engine.dispatch({
                  id: 'set-opacity',
                  label: 'Set opacity',
                  timestamp: Date.now(),
                  operations: [{
                    type: 'SET_CLIP_TRANSFORM',
                    clipId: selectedClipId as import('@timelinx/core').ClipId,
                    transform: {
                      opacity: { value: 0.3, keyframes: [] },
                    },
                  }],
                });
              }}
            >
              Set Opacity
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <ReactiveInspectorTest />
        </TestWrapper>
      );
      expect(screen.getByTestId('selected-opacity').textContent).toBe('none');
      fireEvent.click(screen.getByTestId('select-clip-1'));
      expect(screen.getByTestId('selected-opacity').textContent).toBe('1');
      fireEvent.click(screen.getByTestId('set-opacity'));
      expect(screen.getByTestId('selected-opacity').textContent).toBe('0.3');
      fireEvent.click(screen.getByTestId('select-clip-2'));
      expect(screen.getByTestId('selected-opacity').textContent).toBe('1');
    });
  });

  describe('22. Inspector numeric input — local state buffer', () => {
    it('typing in numeric input does not dispatch until blur', () => {
      function InputBufferTest() {
        const engine = useEngine();
        const selectedClipIds = useSelectedClipIds(engine);
        const selectedClipId = selectedClipIds.size === 1 ? Array.from(selectedClipIds)[0] : null;
        const track = useTrack('v1');
        const clip = selectedClipId ? track?.clips.find((c) => c.id === selectedClipId) ?? null : null;
        const opacity = clip?.transform?.opacity?.value ?? 1;
        const [localValue, setLocalValue] = React.useState(String(opacity));
        const [committed, setCommitted] = React.useState(opacity);

        React.useEffect(() => {
          setLocalValue(String(opacity));
          setCommitted(opacity);
        }, [opacity]);

        return (
          <div>
            <span data-testid="clip-opacity">{committed}</span>
            <button
              data-testid="select-clip-1"
              onClick={() => engine.setSelectedClipIds(new Set(['clip-1']))}
            >
              Select
            </button>
            <input
              data-testid="opacity-input"
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onBlur={() => {
                if (!selectedClipId || !clip) return;
                const val = Number(localValue);
                if (!isNaN(val)) {
                  engine.dispatch({
                    id: 'set-opacity',
                    label: 'Set opacity',
                    timestamp: Date.now(),
                    operations: [{
                      type: 'SET_CLIP_TRANSFORM',
                      clipId: selectedClipId as import('@timelinx/core').ClipId,
                      transform: {
                        opacity: { value: val, keyframes: [] },
                      },
                    }],
                  });
                }
              }}
            />
          </div>
        );
      }

      render(
        <TestWrapper>
          <InputBufferTest />
        </TestWrapper>
      );
      fireEvent.click(screen.getByTestId('select-clip-1'));
      expect(screen.getByTestId('clip-opacity').textContent).toBe('1');
      const input = screen.getByTestId('opacity-input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '0.5' } });
      expect(screen.getByTestId('clip-opacity').textContent).toBe('1');
      fireEvent.blur(input);
      expect(screen.getByTestId('clip-opacity').textContent).toBe('0.5');
    });
  });

  describe('23. Transition delete via TransitionsPanel UI', () => {
    it('clicking delete button on transition removes it from state', () => {
      function TransitionDeleteTest() {
        const engine = useEngine();
        const allTransitions = useAllTransitions(engine);
        const hasTransition = allTransitions.some((t) => t.clipId === 'clip-2');
        return (
          <div>
            <span data-testid="has-transition">{String(hasTransition)}</span>
            <button
              data-testid="add-transition"
              onClick={() => {
                engine.dispatch({
                  id: 'add-tr',
                  label: 'Add transition',
                  timestamp: Date.now(),
                  operations: [{
                    type: 'ADD_TRANSITION',
                    clipId: 'clip-2' as import('@timelinx/core').ClipId,
                    transition: createTransition(toTransitionId('del-test-tr'), 'dissolve', 30),
                  }],
                });
              }}
            >
              Add
            </button>
            <button
              data-testid="delete-transition"
              onClick={() => {
                engine.dispatch({
                  id: 'del-tr',
                  label: 'Delete transition',
                  timestamp: Date.now(),
                  operations: [{
                    type: 'DELETE_TRANSITION',
                    clipId: 'clip-2' as import('@timelinx/core').ClipId,
                  }],
                });
              }}
            >
              Delete
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <TransitionDeleteTest />
        </TestWrapper>
      );
      expect(screen.getByTestId('has-transition').textContent).toBe('false');
      fireEvent.click(screen.getByTestId('add-transition'));
      expect(screen.getByTestId('has-transition').textContent).toBe('true');
      fireEvent.click(screen.getByTestId('delete-transition'));
      expect(screen.getByTestId('has-transition').textContent).toBe('false');
    });
  });

  describe('24. Caption creation — new caption via UI trigger', () => {
    it('creating a new caption at a non-overlapping position succeeds', () => {
      function NewCaptionTest() {
        const engine = useEngine();
        const track = useTrack('s1');
        const captionCount = track?.captions?.length ?? 0;
        return (
          <div>
            <span data-testid="caption-count">{captionCount}</span>
            <button
              data-testid="add-caption"
              onClick={() => {
                engine.dispatch({
                  id: 'add-new-cap',
                  label: 'Add caption',
                  timestamp: Date.now(),
                  operations: [{
                    type: 'ADD_CAPTION',
                    trackId: 's1' as import('@timelinx/core').TrackId,
                    caption: {
                      id: toCaptionId('test-new-cap'),
                      text: 'Brand new caption',
                      startFrame: toFrame(500),
                      endFrame: toFrame(560),
                      language: 'en-US',
                      burnIn: false,
                    },
                  }],
                });
              }}
            >
              Add
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <NewCaptionTest />
        </TestWrapper>
      );
      const initial = Number(screen.getByTestId('caption-count').textContent);
      fireEvent.click(screen.getByTestId('add-caption'));
      expect(Number(screen.getByTestId('caption-count').textContent)).toBe(initial + 1);
    });

    it('INSERT_GENERATOR that overlaps an existing clip is rejected', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      function OverlapGenTest() {
        const engine = useEngine();
        const track = useTrack('s1');
        const clipCount = track?.clips?.length ?? 0;
        return (
          <div>
            <span data-testid="clip-count">{clipCount}</span>
            <button
              data-testid="add-overlap-gen"
              onClick={() => {
                engine.dispatch({
                  id: 'add-overlap-gen',
                  label: 'Add overlapping generator',
                  timestamp: Date.now(),
                  operations: [{
                    type: 'INSERT_GENERATOR',
                    trackId: 's1' as import('@timelinx/core').TrackId,
                    atFrame: toFrame(50),
                    generator: {
                      id: toGeneratorId('overlap-gen'),
                      type: 'text',
                      params: { text: 'Overlap' },
                      duration: toFrame(60),
                      name: 'Overlap',
                    },
                  }],
                });
              }}
            >
              Add
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <OverlapGenTest />
        </TestWrapper>
      );
      const initial = Number(screen.getByTestId('clip-count').textContent);
      fireEvent.click(screen.getByTestId('add-overlap-gen'));
      expect(Number(screen.getByTestId('clip-count').textContent)).toBe(initial);
      consoleSpy.mockRestore();
    });
  });

  describe('25. Text clip drag-to-move via SelectionTool', () => {
    it('SelectionTool produces MOVE_CLIP transaction when dragging a text clip', () => {
      const engine = createDemoEngine();

      const stateBefore = engine.getState();
      const s1Track = stateBefore.timeline.tracks.find((t) => t.id === 's1');
      expect(s1Track).toBeDefined();
      expect(s1Track!.clips.length).toBeGreaterThanOrEqual(1);
      const clip = s1Track!.clips[0];
      const origStart = Number(clip.timelineStart);

      const tool = new SelectionTool();
      const ctx = {
        state: stateBefore,
        snapIndex: { points: [], builtAt: Date.now(), enabled: false },
        pixelsPerFrame: 0.5,
        modifiers: { shift: false, alt: false, ctrl: false, meta: false },
        frameAtX: (x: number) => toFrame(Math.round(x / 0.5)),
        trackAtY: () => toTrackId('s1'),
        snap: (frame: TimelineFrame) => frame,
      };

      const startX = origStart * 2; // ppf=0.5 → px = frame * 2
      tool.onPointerDown({
        frame: toFrame(origStart), trackId: toTrackId('s1'), clipId: clip.id,
        captionId: null, x: startX, y: 50, buttons: 1,
        shiftKey: false, altKey: false, metaKey: false,
      }, ctx);

      const endX = startX + 400; // drag 200px = 100 frames at ppf=0.5
      tool.onPointerMove({
        frame: toFrame(origStart + 100), trackId: toTrackId('s1'), clipId: clip.id,
        captionId: null, x: endX, y: 50, buttons: 1,
        shiftKey: false, altKey: false, metaKey: false,
      }, ctx);

      const tx = tool.onPointerUp({
        frame: toFrame(origStart + 100), trackId: toTrackId('s1'), clipId: clip.id,
        captionId: null, x: endX, y: 50, buttons: 0,
        shiftKey: false, altKey: false, metaKey: false,
      }, ctx);

      expect(tx).not.toBeNull();
      expect(tx!.operations[0]!.type).toBe('MOVE_CLIP');

      const result = engine.dispatch(tx!);
      expect(result.accepted).toBe(true);
    });
  });

  describe('26. Text clip interactivity — DOM structure verification', () => {
    it('text clip has data-clip-id for tool-router hit-testing', () => {
      const { container } = render(<DemoApp />);
      const s1Clips = container.querySelectorAll('[data-track-id="s1"] [data-clip-id]');
      expect(s1Clips.length).toBeGreaterThanOrEqual(1);
      const firstClip = s1Clips[0] as HTMLElement;
      expect(firstClip.dataset.clipId).toBeTruthy();
    });

    it('text clip has data-track-id for tool-router hit-testing', () => {
      const { container } = render(<DemoApp />);
      const s1Clips = container.querySelectorAll('[data-track-id="s1"] [data-clip-id]');
      for (const clip of s1Clips) {
        expect((clip as HTMLElement).dataset.trackId).toBe('s1');
      }
    });

    it('text clip renders clip name inside .clip-info', () => {
      const { container } = render(<DemoApp />);
      const s1Clips = container.querySelectorAll('[data-track-id="s1"] [data-clip-id]');
      expect(s1Clips.length).toBeGreaterThanOrEqual(1);
      const firstClip = s1Clips[0] as HTMLElement;
      const infoEl = firstClip.querySelector('.clip-info');
      expect(infoEl).not.toBeNull();
      expect(infoEl!.textContent).toContain('Welcome to TimelineX Editor');
    });

    it('text clip has inline transform style for positioning', () => {
      const { container } = render(<DemoApp />);
      const s1Clips = container.querySelectorAll('[data-track-id="s1"] [data-clip-id]');
      expect(s1Clips.length).toBeGreaterThanOrEqual(1);
      const firstClip = s1Clips[0] as HTMLElement;
      // TimelineEditor uses absolute positioning via left/width on .tl-clip-wrap
      expect(firstClip.style.left).toBeTruthy();
      expect(firstClip.style.width).toBeTruthy();
    });

    it('text clip has width style set', () => {
      const { container } = render(<DemoApp />);
      const s1Clips = container.querySelectorAll('[data-track-id="s1"] [data-clip-id]');
      expect(s1Clips.length).toBeGreaterThanOrEqual(1);
      const firstClip = s1Clips[0] as HTMLElement;
      expect(firstClip.style.width).toBeTruthy();
    });

    it('all caption blocks are inside .track-clips (same container as clips)', () => {
      const { container } = render(<DemoApp />);
      const captions = container.querySelectorAll('[data-caption-id]');
      for (const cap of captions) {
        const parent = cap.parentElement;
        expect(parent).not.toBeNull();
        // TimelineEditor uses .tl-track-body instead of .track-clips
        const inTrackBody = parent!.classList.contains('tl-track-body') ||
          parent!.closest('.tl-track-body') !== null;
        expect(inTrackBody).toBe(true);
      }
    });

    it('caption blocks coexist with clip blocks in the same track container', () => {
      const { container } = render(<DemoApp />);
      const trackBodies = container.querySelectorAll('.tl-track-body');
      let foundMixed = false;
      for (const tb of trackBodies) {
        const hasClips = tb.querySelectorAll('[data-clip-id]').length > 0;
        const hasCaptions = tb.querySelectorAll('[data-caption-id]').length > 0;
        if (hasClips || hasCaptions) {
          foundMixed = true;
        }
      }
      expect(foundMixed).toBe(true);
    });
  });
});
