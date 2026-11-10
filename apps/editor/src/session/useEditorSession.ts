import { useCallback, useState, useSyncExternalStore } from 'react';
import type { TimelineEngine } from '@timelinx/react';
import { useMediaAssets } from '@timelinx/ui';
import { EditorSession } from './EditorSession';
import { createEditorEngine } from '../createEditorEngine';
import { createDemoEngine } from '../createDemoEngine';

export interface EditorSessionApi {
  /** The current engine instance (changes reference on project replacement). */
  engine: TimelineEngine;
  /** Unsaved-changes flag, derived from engine state vs. last save. */
  isDirty: boolean;
  /** Remount key that changes whenever the engine is replaced. */
  generation: number;
  /** Replace the current project with a fresh engine or custom factory. */
  replaceEngine: (factory?: () => TimelineEngine) => TimelineEngine;
  /** Replace the current project with a fresh blank engine. */
  newProject: () => void;
  /** Record the current state as the clean baseline (call after a save). */
  markSaved: () => void;
  /** Track an imported asset so its blob URL is revoked on replace/unmount. */
  registerImportedAsset: (assetId: string) => void;
  /** Forget and revoke a single imported asset immediately. */
  releaseImportedAsset: (assetId: string) => void;
}

/**
 * Binds a single {@link EditorSession} into React (plan §6 P1, tasks 2 & 3).
 *
 * Must be called inside a `MediaAssetsProvider` so the session can revoke blob
 * URLs through `removeImportedAsset` when a project is replaced or the app
 * unmounts. The session is created exactly once and disposed on unmount.
 *
 * The session is held in state rather than a ref. Reading and writing
 * `ref.current` while rendering is what react-hooks/refs rejects, and the
 * lazy initializer gives the same create-once semantics without it. The old
 * "recreate when the session was disposed" render pass is gone: nothing in
 * the app disposes a session this hook owns — `dispose` is only ever called by
 * direct owners of an `EditorSession` (see `editor-session.test.ts`).
 */
export function useEditorSession(): EditorSessionApi {
  // `removeImportedAsset` is a zero-dependency useCallback inside the provider
  // (it only touches the provider's own refs), so its identity never changes.
  // Capturing it directly lets the session be built without routing the latest
  // context through `ref.current` — which the render path must not touch.
  const { removeImportedAsset } = useMediaAssets();

  const [session] = useState<EditorSession<TimelineEngine>>(
    () =>
      new EditorSession<TimelineEngine>({
        createEngine: createDemoEngine,
        revokeAsset: removeImportedAsset,
      }),
  );

  // Re-render on dirty / generation changes. The snapshot is a value-comparable
  // string so useSyncExternalStore's Object.is check is stable.
  useSyncExternalStore(
    (onChange) => session.subscribe(onChange),
    () => `${session.getGeneration()}:${session.isDirty() ? 1 : 0}`,
    () => '0:0',
  );

  const replaceEngine = useCallback(
    (factory?: () => TimelineEngine) => session.replaceEngine(factory),
    [session],
  );

  const newProject = useCallback(() => session.replaceEngine(createEditorEngine), [session]);

  const markSaved = useCallback(() => {
    session.markSaved();
  }, [session]);

  const registerImportedAsset = useCallback(
    (assetId: string) => {
      session.registerImportedAsset(assetId);
    },
    [session],
  );

  const releaseImportedAsset = useCallback(
    (assetId: string) => {
      session.releaseImportedAsset(assetId);
    },
    [session],
  );

  return {
    engine: session.getEngine(),
    isDirty: session.isDirty(),
    generation: session.getGeneration(),
    replaceEngine,
    newProject,
    markSaved,
    registerImportedAsset,
    releaseImportedAsset,
  };
}
