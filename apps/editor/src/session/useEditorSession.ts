import { useCallback, useRef, useSyncExternalStore } from 'react';
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
 */

export function useEditorSession(): EditorSessionApi {
  const mediaAssets = useMediaAssets();

  // Keep the latest media-assets context reachable from the session's revoke
  // callback without recreating the session.
  const mediaAssetsRef = useRef(mediaAssets);
  mediaAssetsRef.current = mediaAssets;

  const sessionRef = useRef<EditorSession<TimelineEngine> | null>(null);
  if (sessionRef.current === null || sessionRef.current.isDisposed) {
    sessionRef.current = new EditorSession<TimelineEngine>({
      createEngine: createDemoEngine,
      revokeAsset: (assetId) => {
        mediaAssetsRef.current.removeImportedAsset(assetId);
      },
    });
  }
  const session = sessionRef.current;

  // Re-render on dirty / generation changes. The snapshot is a value-comparable
  // string so useSyncExternalStore's Object.is check is stable.
  useSyncExternalStore(
    (onChange) => session.subscribe(onChange),
    () => `${session.getGeneration()}:${session.isDirty() ? 1 : 0}`,
    () => '0:0',
  );

  const replaceEngine = useCallback(
    (factory?: () => TimelineEngine) => {
      const s = sessionRef.current;
      if (!s || s.isDisposed) {
        sessionRef.current = new EditorSession<TimelineEngine>({
          createEngine: factory ?? createDemoEngine,
          revokeAsset: (assetId) => {
            mediaAssetsRef.current.removeImportedAsset(assetId);
          },
        });
        return sessionRef.current.getEngine();
      }
      return s.replaceEngine(factory);
    },
    [],
  );

  const newProject = useCallback(() => {
    const s = sessionRef.current;
    if (!s || s.isDisposed) {
      sessionRef.current = new EditorSession<TimelineEngine>({
        createEngine: createEditorEngine,
        revokeAsset: (assetId) => {
          mediaAssetsRef.current.removeImportedAsset(assetId);
        },
      });
      return;
    }
    s.replaceEngine(createEditorEngine);
  }, []);

  const markSaved = useCallback(() => {
    sessionRef.current?.markSaved();
  }, []);

  const registerImportedAsset = useCallback(
    (assetId: string) => {
      sessionRef.current?.registerImportedAsset(assetId);
    },
    [],
  );

  const releaseImportedAsset = useCallback(
    (assetId: string) => {
      sessionRef.current?.releaseImportedAsset(assetId);
    },
    [],
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
