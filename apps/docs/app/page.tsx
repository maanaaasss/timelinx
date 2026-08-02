import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-fd-background text-fd-foreground">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-fd-border">
        <span className="text-lg font-bold tracking-tight">Timelinx</span>
        <div className="flex items-center gap-4">
          <Link
            href="/docs"
            className="text-sm text-fd-muted-foreground hover:text-fd-foreground transition-colors"
          >
            Docs
          </Link>
          <a
            href="https://github.com/maanaaasss/timelinx"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-fd-muted-foreground hover:text-fd-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </nav>

      <main className="flex flex-col items-center justify-center px-6 pt-24 pb-32 max-w-3xl mx-auto text-center">
        <div className="inline-block mb-6 px-3 py-1 rounded-full border border-fd-border text-xs text-fd-muted-foreground font-medium tracking-wide">
          Open Source
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-6">
          Timeline editor engine
          <br />
          <span className="text-fd-muted-foreground">for the browser</span>
        </h1>

        <p className="text-lg text-fd-muted-foreground max-w-xl mb-10 leading-relaxed">
          A headless, pure-function timeline engine with drop-in React components.
          Build video editors, NLEs, and motion graphics tools — entirely in the browser.
        </p>

        <div className="flex items-center gap-4 mb-20">
          <Link
            href="/docs/library/quick-start"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-fd-primary text-fd-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Get Started
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
          <a
            href="https://github.com/maanaaasss/timelinx"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-fd-border text-sm font-medium text-fd-muted-foreground hover:text-fd-foreground hover:border-fd-foreground/20 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full text-left">
          <div className="p-5 rounded-xl border border-fd-border">
            <div className="mb-3 text-fd-muted-foreground">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <h3 className="text-sm font-semibold mb-1">Pure-function dispatch</h3>
            <p className="text-xs text-fd-muted-foreground leading-relaxed">
              Predictable state transitions. Built-in validation, transactions, and undo/redo.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-fd-border">
            <div className="mb-3 text-fd-muted-foreground">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <path d="M3 9h18"/>
                <path d="M9 21V9"/>
              </svg>
            </div>
            <h3 className="text-sm font-semibold mb-1">Drop-in UI components</h3>
            <p className="text-xs text-fd-muted-foreground leading-relaxed">
              29 React components. Timeline, panels, controls — compose or use as-is.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-fd-border">
            <div className="mb-3 text-fd-muted-foreground">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" x2="12" y1="22.08" y2="12"/>
              </svg>
            </div>
            <h3 className="text-sm font-semibold mb-1">Headless by design</h3>
            <p className="text-xs text-fd-muted-foreground leading-relaxed">
              Core has zero dependencies. Use with React, Vue, Svelte, or vanilla JS.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
