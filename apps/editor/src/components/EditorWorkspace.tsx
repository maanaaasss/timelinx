import { useCallback, useState } from 'react';
import { TimelineProvider as ReactTimelineProvider } from '@timelinx/react';
import {
  TimelineProvider,
  TimelineLayout,
  MediaAssetsProvider,
  AssetBin,
  CompositorPreview,
  TopNav,
} from '@timelinx/ui';
import { ErrorBoundary } from './ErrorBoundary';
import { CapabilityPreflight } from './CapabilityPreflight';
import { RightPanel } from './RightPanel';
import { useEditorSession } from '../session/useEditorSession';
import '@timelinx/ui/styles/tokens';
import '@timelinx/ui/styles/presets/dark-pro';
import '@timelinx/ui/styles/structure';
import './EditorWorkspace.css';

interface Toast {
  id: number;
  message: string;
}

const PROJECT_NAME = 'Untitled project';

/**
 * The product shell (plan §6 P1, task 1). One intentional workspace: project
 * header, asset bin, preview, timeline, inspector, toast area, modal layer, and
 * a runtime error boundary — all owned by a single {@link useEditorSession}.
 *
 * `MediaAssetsProvider` is mounted exactly once here (outside the session hook,
 * which consumes it). The timeline providers are keyed on the session
 * generation so replacing a project cleanly remounts the engine-bound subtree.
 */
function WorkspaceBody() {
  const session = useEditorSession();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmNew, setConfirmNew] = useState(false);

  const pushToast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const requestNewProject = useCallback(() => {
    if (session.isDirty) setConfirmNew(true);
    else session.newProject();
  }, [session]);

  const confirmNewProject = useCallback(() => {
    session.newProject();
    setConfirmNew(false);
    pushToast('Started a new project.');
  }, [session, pushToast]);

  const handleExport = useCallback(() => {
    pushToast('Export becomes available in a later milestone.');
  }, [pushToast]);

  const projectLabel = `${PROJECT_NAME}${session.isDirty ? ' •' : ''}`;

  return (
    <ErrorBoundary>
      <ReactTimelineProvider engine={session.engine} key={session.generation}>
        <TimelineProvider engine={session.engine}>
          <div className="workspace-root">
            <header className="workspace-header">
              <TopNav projectName={projectLabel} onExport={handleExport} />
              <button
                type="button"
                className="workspace-new-btn"
                onClick={requestNewProject}
                aria-label="New project"
              >
                New
              </button>
            </header>

            <div className="workspace-body">
              <aside className="workspace-bin" aria-label="Media assets">
                <AssetBin />
              </aside>

              <div className="workspace-center">
                <section className="workspace-preview" aria-label="Preview">
                  <CompositorPreview />
                </section>
                <section className="workspace-timeline" aria-label="Timeline">
                  <TimelineLayout showToolbar showRuler showStatusBar />
                </section>
              </div>

              <aside className="workspace-inspector" aria-label="Inspector">
                <RightPanel />
              </aside>
            </div>

            {/* Toast area */}
            <div className="workspace-toasts" role="status" aria-live="polite">
              {toasts.map((t) => (
                <div key={t.id} className="workspace-toast">
                  {t.message}
                </div>
              ))}
            </div>

            {/* Modal layer */}
            {confirmNew && (
              <div
                className="workspace-modal-scrim"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-new-title"
              >
                <div className="workspace-modal">
                  <h2 id="confirm-new-title">Discard unsaved changes?</h2>
                  <p>Starting a new project will discard the current unsaved work.</p>
                  <div className="workspace-modal-actions">
                    <button type="button" onClick={() => setConfirmNew(false)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="workspace-modal-danger"
                      onClick={confirmNewProject}
                    >
                      Discard &amp; start new
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TimelineProvider>
      </ReactTimelineProvider>
    </ErrorBoundary>
  );
}

/** Public entry: preflight → media provider → session-owned workspace. */
export function EditorWorkspace() {
  return (
    <CapabilityPreflight>
      <MediaAssetsProvider>
        <WorkspaceBody />
      </MediaAssetsProvider>
    </CapabilityPreflight>
  );
}
