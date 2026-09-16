import { TimelineProvider as ReactTimelineProvider } from '@timelinx/react';
import { TimelineProvider, TimelineLayout } from '@timelinx/ui';
import { useEditorSession } from '../session/useEditorSession';
import '@timelinx/ui/styles/tokens';
import '@timelinx/ui/styles/presets/dark-pro';
import '@timelinx/ui/styles/structure';
import './EditorWorkspace.css';

function WorkspaceBody() {
  const session = useEditorSession();

  return (
    <ReactTimelineProvider engine={session.engine} key={session.generation}>
      <TimelineProvider engine={session.engine}>
        <div className="workspace-root">
          <div className="workspace-timeline">
            <TimelineLayout showToolbar showRuler showStatusBar />
          </div>
        </div>
      </TimelineProvider>
    </ReactTimelineProvider>
  );
}

export function EditorWorkspace() {
  return <WorkspaceBody />;
}
