import Link from 'next/link';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import {
  Box,
  Pencil,
  Layout,
  Video,
  Share2,
  Sparkles,
  Zap,
  Layers,
  History,
  ArrowRight,
  Code2,
  Terminal,
} from 'lucide-react';

export default function Home() {
  return (
    <HomeLayout
      nav={{
        title: (
          <span className="flex items-center gap-2.5 font-bold tracking-tight text-fd-foreground">
            <span className="size-6 rounded bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-black">
              T
            </span>
            Timelinx
          </span>
        ),
        url: '/',
      }}
      githubUrl="https://github.com/maanaaasss/timelinx"
      links={[
        {
          text: 'Documentation',
          url: '/docs/library',
          active: 'nested-url',
        },
        {
          text: 'Core Engine',
          url: '/docs/core',
          active: 'nested-url',
        },
        {
          text: 'React UI',
          url: '/docs/ui',
          active: 'nested-url',
        },
        {
          text: 'Media Web',
          url: '/docs/media-web',
          active: 'nested-url',
        },
      ]}
    >
      <div className="pointer-events-none fixed top-0 right-0 z-0 hidden h-full w-[30px] scale-x-[-1] bg-[url('/layout/ruler-x.svg')] bg-[length:30px_120px] bg-[position:0_0px] bg-repeat-y opacity-40 lg:block dark:opacity-20 dark:invert"></div>
      <div className="max-w-6xl mx-auto px-6 py-12 lg:py-20 relative">
        {/* Hero */}
        <div className="flex flex-col items-start gap-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-fd-border bg-fd-secondary/60 text-xs font-medium text-fd-secondary-foreground">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Open Source &middot; MIT Licensed
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-fd-foreground leading-[1.1]">
            The Timeline Engine &amp; UI Toolkit for the Web
          </h1>

          <p className="text-lg sm:text-xl text-fd-muted-foreground leading-relaxed">
            A headless, pure-function timeline state engine with ready-to-use React UI components.
            Build video editors, web NLEs, and motion graphics tools in the browser.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/docs/library/quick-start"
              className={buttonVariants({ variant: 'primary' })}
            >
              Get Started
              <ArrowRight className="size-4 ms-1.5" />
            </Link>
            <Link
              href="/docs/library"
              className={buttonVariants({ variant: 'outline' })}
            >
              Read Docs
            </Link>
            <a
              href="https://github.com/maanaaasss/timelinx"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'ghost' })}
            >
              <svg className="size-4 me-1.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>

        {/* Code Showcase */}
        <section className="mt-16 rounded-xl border border-fd-border bg-fd-card overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-fd-border bg-fd-muted/30">
            <div className="flex items-center gap-2 text-xs font-medium text-fd-muted-foreground">
              <Code2 className="size-4 text-fd-primary" />
              <span>Quick Example: Creating a Timeline &amp; Dispatching Clips</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-fd-border" />
              <span className="size-2.5 rounded-full bg-fd-border" />
              <span className="size-2.5 rounded-full bg-fd-border" />
            </div>
          </div>
          <div className="p-6 font-mono text-xs sm:text-sm overflow-x-auto text-fd-foreground leading-relaxed">
            <pre>
              <code>
                <span className="text-purple-400">import</span> &#123; createTimelineStore &#125; <span className="text-purple-400">from</span> <span className="text-emerald-400">&apos;@timelinx/core&apos;</span>;{'\n'}
                <span className="text-purple-400">import</span> &#123; TimelineProvider, Timeline, TrackHeader &#125; <span className="text-purple-400">from</span> <span className="text-emerald-400">&apos;@timelinx/react&apos;</span>;{'\n\n'}
                <span className="text-fd-muted-foreground">// Initialize headless timeline store</span>{'\n'}
                <span className="text-purple-400">const</span> store = <span className="text-amber-400">createTimelineStore</span>();{'\n'}
                store.<span className="text-amber-400">dispatch</span>(&#123; type: <span className="text-emerald-400">&apos;ADD_TRACK&apos;</span>, payload: &#123; id: <span className="text-emerald-400">&apos;track-1&apos;</span>, name: <span className="text-emerald-400">&apos;Video Track&apos;</span> &#125; &#125;);{'\n'}
                store.<span className="text-amber-400">dispatch</span>(&#123; type: <span className="text-emerald-400">&apos;ADD_CLIP&apos;</span>, payload: &#123; trackId: <span className="text-emerald-400">&apos;track-1&apos;</span>, start: <span className="text-cyan-400">0</span>, duration: <span className="text-cyan-400">5</span> &#125; &#125;);{'\n\n'}
                <span className="text-fd-muted-foreground">// Render reactive React UI component</span>{'\n'}
                <span className="text-purple-400">export function</span> <span className="text-amber-400">Editor</span>() &#123;{'\n'}
                {'  '}<span className="text-purple-400">return</span> ({'\n'}
                {'    '}&lt;<span className="text-blue-400">TimelineProvider</span> store=&#123;store&#125;&gt;{'\n'}
                {'      '}&lt;<span className="text-blue-400">Timeline</span> /&gt;{'\n'}
                {'    '}&lt;/<span className="text-blue-400">TimelineProvider</span>&gt;{'\n'}
                {'  '});{'\n'}
                &#125;
              </code>
            </pre>
          </div>
        </section>

        {/* Packages Ecosystem */}
        <section className="mt-20">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-fd-foreground">
              Modular Package Ecosystem
            </h2>
            <p className="text-fd-muted-foreground text-sm sm:text-base mt-1.5">
              Use standalone core packages or compose full-featured timeline editors with React.
            </p>
          </div>

          <Cards className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Card
              icon={<Box className="size-5 text-amber-400" />}
              title="@timelinx/core"
              description="Pure-function state engine with spatial indexing (RBush), atomic transactions, and built-in undo/redo history."
              href="/docs/core"
            />
            <Card
              icon={<Pencil className="size-5 text-cyan-400" />}
              title="@timelinx/react"
              description="Reactive hooks and providers: useTimeline, useDispatch, and useTimelineSelector with zero re-render waste."
              href="/docs/react"
            />
            <Card
              icon={<Layout className="size-5 text-blue-400" />}
              title="@timelinx/ui"
              description="29+ customizable React components: Timeline grid, TrackHeaders, ClipItems, Playhead, and Zoom controls."
              href="/docs/ui"
            />
            <Card
              icon={<Video className="size-5 text-emerald-400" />}
              title="@timelinx/media-web"
              description="Web Audio/Video frame decoding, waveform generation, and HTML5 Canvas video playback sync."
              href="/docs/media-web"
            />
            <Card
              icon={<Share2 className="size-5 text-purple-400" />}
              title="@timelinx/collab"
              description="Real-time multi-user editing backed by Yjs CRDTs with WebRTC and WebSocket provider support."
              href="/docs/library"
            />
            <Card
              icon={<Sparkles className="size-5 text-pink-400" />}
              title="@timelinx/ai"
              description="AI transcript-to-timeline alignment, automatic clip cutting, and intelligent scene boundary detection."
              href="/docs/library"
            />
          </Cards>
        </section>

        {/* Key Features */}
        <section className="mt-20">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-fd-foreground">
              Engineered for Production Editors
            </h2>
            <p className="text-fd-muted-foreground text-sm sm:text-base mt-1.5">
              Architected to handle complex track layouts, precise scrubbing, and high-frequency updates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-fd-border bg-fd-card">
              <Zap className="size-6 text-amber-400 mb-3" />
              <h3 className="text-base font-semibold text-fd-foreground mb-1.5">Pure Dispatch State</h3>
              <p className="text-sm text-fd-muted-foreground leading-relaxed">
                Deterministic state management with atomic transactions and single-dispatch multi-track operations.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-fd-border bg-fd-card">
              <Layers className="size-6 text-cyan-400 mb-3" />
              <h3 className="text-base font-semibold text-fd-foreground mb-1.5">Spatial Indexing (RBush)</h3>
              <p className="text-sm text-fd-muted-foreground leading-relaxed">
                2D spatial search algorithms ensure smooth 60fps playhead sync and clip queries across thousands of clips.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-fd-border bg-fd-card">
              <History className="size-6 text-emerald-400 mb-3" />
              <h3 className="text-base font-semibold text-fd-foreground mb-1.5">Undo &amp; Redo Engine</h3>
              <p className="text-sm text-fd-muted-foreground leading-relaxed">
                Full timeline history stack out of the box with zero side effects, custom stack limits, and transaction scoping.
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="mt-20 mb-8 p-8 sm:p-12 rounded-2xl border border-fd-border bg-fd-card text-center relative overflow-hidden">
          <div className="max-w-xl mx-auto flex flex-col items-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-fd-foreground mb-3">
              Start Building Today
            </h2>
            <p className="text-fd-muted-foreground text-sm sm:text-base mb-8 leading-relaxed">
              Install the packages and compose your custom browser timeline editor in minutes.
            </p>
            <div className="inline-flex items-center gap-3 px-4 py-3 rounded-lg border border-fd-border bg-fd-secondary/60 text-fd-foreground font-mono text-xs sm:text-sm">
              <Terminal className="size-4 text-fd-muted-foreground" />
              <span>pnpm add @timelinx/core @timelinx/react @timelinx/ui</span>
            </div>
          </div>
        </section>
      </div>
    </HomeLayout>
  );
}

