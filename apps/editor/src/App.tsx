import { EditorWorkspace } from './components/EditorWorkspace';

const globalStyle = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #root { height: 100%; width: 100%; overflow: hidden; }
  body { background: #1c1f26; }
`;

function App() {
  return (
    <>
      <style>{globalStyle}</style>
      <EditorWorkspace />
    </>
  );
}

export default App;
