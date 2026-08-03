import Link from 'next/link';

function TimelineVisual() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.15),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_50%,rgba(139,92,246,0.08),transparent)]" />

      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Floating timeline tracks */}
      <div className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
      <div className="absolute top-[45%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/15 to-transparent" />
      <div className="absolute top-[58%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/10 to-transparent" />

      {/* Clip blocks on tracks */}
      <div className="absolute top-[calc(33%-12px)] left-[15%] w-32 h-6 rounded bg-indigo-500/10 border border-indigo-500/20" />
      <div className="absolute top-[calc(33%-12px)] left-[calc(15%+140px)] w-20 h-6 rounded bg-indigo-400/8 border border-indigo-400/15" />
      <div className="absolute top-[calc(33%-12px)] left-[calc(15%+170px)] w-44 h-6 rounded bg-indigo-500/10 border border-indigo-500/20" />

      <div className="absolute top-[calc(45%-10px)] left-[25%] w-40 h-5 rounded bg-violet-500/10 border border-violet-500/15" />
      <div className="absolute top-[calc(45%-10px)] left-[calc(25%+168px)] w-28 h-5 rounded bg-violet-400/8 border border-violet-400/12" />

      <div className="absolute top-[calc(58%-8px)] left-[10%] w-24 h-4 rounded bg-purple-500/8 border border-purple-500/12" />
      <div className="absolute top-[calc(58%-8px)] left-[calc(10%+100px)] w-56 h-4 rounded bg-purple-500/8 border border-purple-500/12" />

      {/* Playhead */}
      <div className="absolute top-[28%] left-[42%] w-px h-[35%] bg-gradient-to-b from-indigo-400/60 via-indigo-400/30 to-transparent" />
      <div className="absolute top-[28%] left-[42%] -translate-x-1 w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.6)]" />

      {/* Noise overlay */}
      <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        <div className="mb-4 inline-flex items-center justify-center size-10 rounded-xl bg-white/[0.06] text-fd-muted-foreground group-hover:text-fd-foreground transition-colors">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-fd-foreground mb-1.5">{title}</h3>
        <p className="text-sm text-fd-muted-foreground leading-relaxed">{description}</p>
      </div>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#09090b] text-white selection:bg-indigo-500/30">
      <TimelineVisual />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M4 12h4M8 12h8M16 12h4" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight">Timelinx</span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/docs"
            className="px-3.5 py-2 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-all"
          >
            Docs
          </Link>
          <a
            href="https://github.com/maanaaasss/timelinx"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-all inline-flex items-center gap-1.5"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </a>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-20 sm:pt-28 lg:pt-36 pb-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs text-zinc-400 font-medium tracking-wide">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Open source &middot; MIT licensed
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              Timeline engine
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                for the browser
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-zinc-400 max-w-xl mb-10 leading-relaxed">
              A headless, pure-function timeline engine with drop-in React components.
              Build video editors, NLEs, and motion graphics tools entirely in the browser.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/docs/library/quick-start"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors"
              >
                Get Started
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/docs/library"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/[0.1] text-sm font-medium text-zinc-300 hover:text-white hover:border-white/[0.2] hover:bg-white/[0.04] transition-all"
              >
                Read the Docs
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              href="/docs/core"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              }
              title="Pure-function dispatch"
              description="Predictable state transitions with built-in validation, transactions, and undo/redo."
            />
            <FeatureCard
              href="/docs/ui"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
              }
              title="29 React components"
              description="Timeline, panels, controls, and transport — compose together or use as-is."
            />
            <FeatureCard
              href="/docs/library/architecture"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" x2="12" y1="22.08" y2="12" />
                </svg>
              }
              title="Headless by design"
              description="Zero runtime dependencies in core. Use with React, Vue, Svelte, or vanilla JS."
            />
            <FeatureCard
              href="/docs/core/undo-redo"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v6h6" />
                  <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                </svg>
              }
              title="Undo &amp; redo"
              description="Full history stack with pure-function undo/redo. No side effects, no surprises."
            />
            <FeatureCard
              href="/docs/react"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="2" />
                  <path d="M12 2a10 10 0 1 0 10 10" />
                  <path d="M12 2v4" />
                  <path d="M12 18v4" />
                </svg>
              }
              title="React hooks"
              description="UseTimeline, useDispatch, useTimelineSelector — reactive state with zero boilerplate."
            />
            <FeatureCard
              href="/docs/core/transactions"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 3h5v5" />
                  <path d="M8 3H3v5" />
                  <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
                  <path d="m15 9 6-6" />
                </svg>
              }
              title="Atomic transactions"
              description="Batch multiple operations into a single atomic dispatch. All-or-nothing state updates."
            />
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-24">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] px-8 py-12 sm:px-12 sm:py-16 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.04] via-transparent to-violet-500/[0.04]" />
            <div className="relative">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                Ready to build?
              </h2>
              <p className="text-zinc-400 mb-8 max-w-md mx-auto">
                Install the packages and start building your timeline editor in minutes.
              </p>
              <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-lg bg-black border border-white/[0.08] font-mono text-sm text-zinc-300">
                <span className="text-zinc-500">$</span>
                <span>npm install @timelinx/core @timelinx/react @timelinx/ui</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <div className="size-5 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                <path d="M4 12h4M8 12h8M16 12h4" />
              </svg>
            </div>
            Timelinx &middot; MIT License
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <Link href="/docs" className="hover:text-zinc-300 transition-colors">
              Documentation
            </Link>
            <a
              href="https://github.com/maanaaasss/timelinx"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-300 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
