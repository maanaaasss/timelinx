import { useState } from 'react';
import { createEditorEngine } from './createEditorEngine';
import { TimelineEditor } from '@timelinx/ui';
import '@timelinx/ui/styles/tokens';
import '@timelinx/ui/styles/presets/dark-pro';
import '@timelinx/ui/styles/structure';

const globalStyle = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #root { height: 100%; width: 100%; overflow: hidden; }
  body { background: #1c1f26; }
`;

function App() {
  const [engine] = useState(() => createEditorEngine());

  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ width: '100vw', height: '100vh' }}>
        <TimelineEditor
          engine={engine}
          showSidebar={true}
          showTopNav={true}
          showTransportControls={true}
          showMediaBrowser={true}
          showToolbar={true}
          projectName="Video Popular Vlog_Duplicate"
          onExport={() => console.log('Export clicked')}
        />
      </div>
    </>
  );
}

export default App;
