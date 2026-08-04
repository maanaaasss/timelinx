import Link from 'next/link';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { Card, Cards } from 'fumadocs-ui/components/card';
import {
  Box,
  Pencil,
  Layout,
  Video,
  Zap,
  Layers,
  History,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Cpu,
} from 'lucide-react';
import { InstallBlock } from './components/install-block';
import { TimelinePreviewCard } from './components/timeline-preview-card';

export default function Home() {
  return (
    <HomeLayout
      nav={{
        title: (
          <span className="flex items-center gap-2.5 font-bold tracking-tight text-white">
            <span className="size-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-orange-500/20">
              T
            </span>
            Timelinx
          </span>
        ),
        url: '/',
      }}
      githubUrl="https://github.com/maanaaasss/timelinx"
      links={[
        { text: 'Docs', url: '/docs/library', active: 'nested-url' },
        { text: 'Core', url: '/docs/core', active: 'nested-url' },
        { text: 'React', url: '/docs/react', active: 'nested-url' },
        { text: 'UI', url: '/docs/ui', active: 'nested-url' },
        { text: 'Media Web', url: '/docs/media-web', active: 'nested-url' },
      ]}
    >
      <div className="relative min-h-screen bg-[#030303] text-[#ECECF0] overflow-hidden">
        {/* Subtle background ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(224,122,47,0.08)_0%,rgba(124,58,237,0.04)_40%,transparent_70%)] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6">
          {/* ── Hero Section ── */}
          <section className="pt-20 pb-16 lg:pt-28 lg:pb-24 text-center flex flex-col items-center">
            {/* Version Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-md mb-8">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
              </span>
              <span className="text-xs font-medium text-[#B4B4C8]">
                v0.1.0 &middot; Open Source Timeline Engine for React
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] max-w-4xl mb-6">
              <span className="bg-gradient-to-b from-white via-[#ECECF0] to-[#8888A0] bg-clip-text text-transparent">
                The Timeline Engine &amp; UI Toolkit
              </span>
              <br />
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
                Built for the Web
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-[#8888A0] text-base sm:text-lg leading-relaxed max-w-2xl mb-10">
              Headless pure-function state engine with React UI components. Build non-linear video editors, audio multitrackers, and motion graphics tools with WebCodecs playback.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
              <Link
                href="/docs/library/quick-start"
                className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Get Started
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <Link
                href="/docs/library"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#ECECF0] text-sm font-medium hover:bg-white/[0.06] hover:border-white/[0.14] transition-all"
              >
                <BookOpen className="size-4 text-[#8888A0]" />
                Documentation
              </Link>

              <a
                href="https://github.com/maanaaasss/timelinx"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-[#8888A0] text-sm hover:text-white transition-colors"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </a>
            </div>

            {/* Package Install Bar */}
            <div className="w-full flex justify-center mb-16">
              <InstallBlock />
            </div>

            {/* Interactive Timeline Mockup Card */}
            <div className="w-full max-w-4xl">
              <TimelinePreviewCard />
            </div>
          </section>

          {/* ── Divider ── */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          {/* ── Official Packages Ecosystem ── */}
          <section className="py-20">
            <div className="text-center max-w-xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
                Modular Package Ecosystem
              </h2>
              <p className="text-[#8888A0] text-sm sm:text-base">
                Use headless core state management or compose rich timeline UIs with React components and browser media adapters.
              </p>
            </div>

            <Cards className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card
                icon={<Box className="size-5 text-purple-400" />}
                title="@timelinx/core"
                description="Headless engine. Deterministic dispatch, 24-point invariant checks, spatial index (TrackIndex), and undo/redo."
                href="/docs/core"
              />
              <Card
                icon={<Pencil className="size-5 text-[#aa99ff]" />}
                title="@timelinx/react"
                description="React bindings. TimelineEngine state manager, useSyncExternalStore selective hooks, and tool routing."
                href="/docs/react"
              />
              <Card
                icon={<Layout className="size-5 text-blue-400" />}
                title="@timelinx/ui"
                description="Component library. 30+ customizable UI components (TimelineEditor, TimelineTrack, Clip, Ruler, Panels)."
                href="/docs/ui"
              />
              <Card
                icon={<Video className="size-5 text-emerald-400" />}
                title="@timelinx/media-web"
                description="Browser media pipeline. WebCodecs GPU video decoding, WebGL compositing, Web Audio waveforms, export."
                href="/docs/media-web"
              />
            </Cards>
          </section>

          {/* ── Divider ── */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          {/* ── Architecture Highlights ── */}
          <section className="py-20">
            <div className="text-center max-w-xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
                Engine Architecture
              </h2>
              <p className="text-[#8888A0] text-sm sm:text-base">
                Designed for high-frequency scrubbing, deterministic undo history, and sub-millisecond timeline operations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ArchitectureCard
                icon={<Zap className="size-5 text-amber-400" />}
                title="Pure Dispatch Engine"
                description="State mutations flow through pure dispatch function (state, transaction) → result. Atomic operations guarantee zero corrupt states."
              />
              <ArchitectureCard
                icon={<Layers className="size-5 text-cyan-400" />}
                title="Spatial Indexing & 60fps"
                description="TrackIndex interval trees perform O(log n) clip lookups per frame. Hooks subscribe selectively via useSyncExternalStore for zero re-render waste."
              />
              <ArchitectureCard
                icon={<Cpu className="size-5 text-emerald-400" />}
                title="Hardware Video Pipeline"
                description="WebCodecs decodes video frames directly on the GPU. WebGL 2 shaders composite multitrack layers while Web Workers extract audio waveforms."
              />
            </div>
          </section>

          {/* ── Divider ── */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          {/* ── Code Demo Section ── */}
          <section className="py-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-4">
                  Simple to Embed, Unlimited Power
                </h2>
                <p className="text-[#8888A0] text-sm sm:text-base leading-relaxed mb-6">
                  Instantiate <code className="text-[#ECECF0] font-mono text-xs bg-white/[0.06] px-1.5 py-0.5 rounded">TimelineEngine</code> with pure initial state, then render <code className="text-[#ECECF0] font-mono text-xs bg-white/[0.06] px-1.5 py-0.5 rounded">&lt;TimelineEditor engine={'{engine}'} /&gt;</code>. Full keyboard shortcuts, zoom controls, selection, and undo history work out of the box.
                </p>

                <div className="space-y-3">
                  <FeatureListItem text="Pure state serialization (JSON save & restore)" />
                  <FeatureListItem text="12 built-in editing tools (Razor, Ripple Trim, Roll Trim, Slip, Slide)" />
                  <FeatureListItem text="CSS custom property design tokens (Amber LED & Premiere Pro theme)" />
                  <FeatureListItem text="Decomposable UI components for custom editor layouts" />
                </div>
              </div>

              {/* Code Snippet Box */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0A0A0F] p-4 font-mono text-xs overflow-x-auto shadow-2xl">
                <div className="flex items-center justify-between text-[#8888A0] pb-3 border-b border-white/[0.06] mb-3">
                  <span>app/editor/page.tsx</span>
                  <span>TypeScript</span>
                </div>
                <pre className="text-[#B4B4C8] leading-relaxed">
                  <code>
                    <span className="text-purple-400">import</span> {'{ TimelineEngine }'} <span className="text-purple-400">from</span> <span className="text-emerald-400">'@timelinx/react'</span>;<br />
                    <span className="text-purple-400">import</span> {'{ TimelineEditor }'} <span className="text-purple-400">from</span> <span className="text-emerald-400">'@timelinx/ui'</span>;<br />
                    <span className="text-purple-400">import</span> {'{ createTimelineState, createTimeline }'} <span className="text-purple-400">from</span> <span className="text-emerald-400">'@timelinx/core'</span>;<br />
                    <br />
                    <span className="text-[#8888A0]">// 1. Initialize engine with pure state</span><br />
                    <span className="text-purple-400">const</span> engine = <span className="text-purple-400">new</span> <span className="text-amber-300">TimelineEngine</span>({'{'}<br />
                    {'  '}initialState: <span className="text-amber-300">createTimelineState</span>({'{'}<br />
                    {'    '}timeline: <span className="text-amber-300">createTimeline</span>({'{'} id: <span className="text-emerald-400">'tl-1'</span>, name: <span className="text-emerald-400">'My Edit'</span> {'}'})<br />
                    {'  '}{'}'})<br />
                    {'}'});<br />
                    <br />
                    <span className="text-[#8888A0]">// 2. Render fully wired timeline editor</span><br />
                    <span className="text-purple-400">export default function</span> <span className="text-amber-300">Editor</span>() {'{'}<br />
                    {'  '}<span className="text-purple-400">return</span> &lt;<span className="text-cyan-300">TimelineEditor</span> engine={'{engine}'} /&gt;;<br />
                    {'}'}
                  </code>
                </pre>
              </div>
            </div>
          </section>

          {/* ── Bottom CTA ── */}
          <section className="py-20 text-center">
            <div className="relative inline-block max-w-xl">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
                Ready to Build Your Timeline Editor?
              </h2>
              <p className="text-[#8888A0] text-sm sm:text-base mb-8">
                Explore the documentation, follow the quick start guide, or dive into the core package reference.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/docs/library/quick-start"
                  className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Quick Start Guide
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/docs/library"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#ECECF0] text-sm font-medium hover:bg-white/[0.06] hover:border-white/[0.14] transition-all"
                >
                  <BookOpen className="size-4 text-[#8888A0]" />
                  Browse Documentation
                </Link>
              </div>
            </div>
          </section>

          <div className="h-12" />
        </div>
      </div>
    </HomeLayout>
  );
}

function ArchitectureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#0C0C10]/80 backdrop-blur-sm hover:border-white/[0.12] transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
      <p className="text-xs sm:text-sm text-[#8888A0] leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureListItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-[#ECECF0]">
      <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
