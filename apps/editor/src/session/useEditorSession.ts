import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { TimelineEngine } from '@timelinx/react';
import { EditorSession } from './EditorSession';
import { createDemoEngine } from '../createDemoEngine';

export interface EditorSessionApi {
  engine: TimelineEngine;
  isDirty: boolean;
  generation: number;
  newProject: () => void;
  markSaved: () => void;
}

export function useEditorSession(): EditorSessionApi {
  const sessionRef = useRef<EditorSession<TimelineEngine> | null>(null);
  if (sessionRef.current === null) {
    sessionRef.current = new EditorSession<TimelineEngine>({
      createEngine: createDemoEngine,
    });
  }
  const session = sessionRef.current;

  useEffect(() => {
    return () => {
      session.dispose();
      sessionRef.current = null;
    };
  }, [session]);

  useSyncExternalStore(
    (onChange) => session.subscribe(onChange),
    () => `${session.getGeneration()}:${session.isDirty() ? 1 : 0}`,
    () => '0:0',
  );

  const newProject = useCallback(() => {
    session.replaceEngine();
  }, [session]);

  const markSaved = useCallback(() => {
    session.markSaved();
  }, [session]);

  return {
    engine: session.getEngine(),
    isDirty: session.isDirty(),
    generation: session.getGeneration(),
    newProject,
    markSaved,
  };
}
