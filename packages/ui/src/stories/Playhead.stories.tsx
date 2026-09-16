import type { Meta, StoryObj } from '@storybook/react';
import React, { useMemo, useState } from 'react';
import { Playhead as PlayheadComponent } from '../components/timeline/playhead';
import { RulerPlayheadV3 } from '../components/timeline/ruler-playhead-v3';
import { TimelineProvider } from '../context/timeline-context';
import { createMockEngine } from './helpers/mock-engine';

function ProviderDecorator({ children }: { children: React.ReactNode }) {
  const engine = useMemo(() => createMockEngine(), []);
  return (
    <TimelineProvider engine={engine} initialPpf={10}>
      {children}
    </TimelineProvider>
  );
}

function useEngine() {
  return useMemo(() => createMockEngine(), []);
}

/* ═══════════════════════════════════════════════════════════
   Playhead — Track-area playhead
   ═══════════════════════════════════════════════════════════ */

const playheadMeta: Meta<typeof PlayheadComponent> = {
  title: 'Timeline/Playhead',
  component: PlayheadComponent,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ProviderDecorator>
        <Story />
      </ProviderDecorator>
    ),
  ],
};

export default playheadMeta;
type PlayheadStory = StoryObj<typeof PlayheadComponent>;

export const TrackPlayhead: PlayheadStory = {
  name: 'Track Playhead',
  render: () => {
    const engine = useEngine();
    return (
      <div
        className="tl-track-area"
        style={{
          position: 'relative',
          width: '100%',
          height: '120px',
          background: 'var(--bg-app)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'auto',
        }}
      >
        <div style={{ minWidth: '4000px', minHeight: '100%', position: 'relative' }}>
          <PlayheadComponent engine={engine} ppf={10} />
        </div>
      </div>
    );
  },
};

export const TrackPlayheadAtStart: PlayheadStory = {
  name: 'At Frame 0',
  render: () => {
    const engine = useMemo(() => {
      const e = createMockEngine();
      e.seekTo(0 as any);
      return e;
    }, []);
    return (
      <div
        className="tl-track-area"
        style={{
          position: 'relative',
          width: '100%',
          height: '120px',
          background: 'var(--bg-app)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'auto',
        }}
      >
        <div style={{ minWidth: '4000px', minHeight: '100%', position: 'relative' }}>
          <PlayheadComponent engine={engine} ppf={10} />
        </div>
      </div>
    );
  },
};

export const TrackPlayheadFarRight: PlayheadStory = {
  name: 'Far Right (frame 1500)',
  render: () => {
    const engine = useMemo(() => {
      const e = createMockEngine();
      e.seekTo(1500 as any);
      return e;
    }, []);
    return (
      <div
        className="tl-track-area"
        style={{
          position: 'relative',
          width: '100%',
          height: '120px',
          background: 'var(--bg-app)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'auto',
        }}
      >
        <div style={{ minWidth: '4000px', minHeight: '100%', position: 'relative' }}>
          <PlayheadComponent engine={engine} ppf={10} />
        </div>
      </div>
    );
  },
};

/* ═══════════════════════════════════════════════════════════
   RulerPlayheadV3 — Ruler playhead with drag-to-seek
   ═══════════════════════════════════════════════════════════ */

const rulerV3Meta: Meta<typeof RulerPlayheadV3> = {
  title: 'Timeline/RulerPlayheadV3',
  component: RulerPlayheadV3,
  tags: ['autodocs'],
  argTypes: {
    currentTime: { control: { type: 'range', min: 0, max: 9000, step: 1 } },
    ppf: { control: { type: 'number', min: 1, max: 50 } },
    scrollLeft: { control: { type: 'number', min: 0 } },
    showLine: { control: 'boolean' },
    duration: { control: { type: 'number' } },
  },
};

export const RulerV3: StoryObj<typeof RulerPlayheadV3> = {
  name: 'Ruler Playhead (V3)',
  render: (args) => (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '80px',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      <RulerPlayheadV3 {...args} />
    </div>
  ),
  args: {
    currentTime: 300,
    ppf: 10,
    scrollLeft: 0,
    showLine: true,
    duration: 9000,
  },
};

export const RulerV3Draggable: StoryObj<typeof RulerPlayheadV3> = {
  name: 'Ruler V3 — Draggable',
  render: () => {
    const [frame, setFrame] = useState(300);
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '120px',
          background: 'var(--bg-app)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'relative',
            height: '24px',
            background: 'var(--bg-panel)',
            borderBottom: '1px solid var(--border-subtle)',
            overflow: 'hidden',
          }}
        >
          <RulerPlayheadV3
            currentTime={frame}
            ppf={10}
            onSeek={setFrame}
            duration={9000}
            showLine={false}
          />
        </div>
        <div style={{ position: 'relative', flex: 1 }}>
          <RulerPlayheadV3
            currentTime={frame}
            ppf={10}
            onSeek={setFrame}
            duration={9000}
            showLine
          />
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-tertiary)',
          }}
        >
          Frame: {frame}
        </div>
      </div>
    );
  },
};

export const RulerV3Scrolled: StoryObj<typeof RulerPlayheadV3> = {
  name: 'Ruler V3 — Scrolled',
  render: () => (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '80px',
        background: 'var(--bg-app)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      <RulerPlayheadV3 currentTime={600} ppf={10} scrollLeft={200} showLine duration={9000} />
    </div>
  ),
};

/* ═══════════════════════════════════════════════════════════
   All Variants — Side by side comparison
   ═══════════════════════════════════════════════════════════ */

export const AllVariants: StoryObj = {
  name: 'All Playhead Variants',
  render: () => {
    const engine = useEngine();
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-condensed)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: '6px',
            }}
          >
            Track Playhead
          </div>
          <div
            className="tl-track-area"
            style={{
              position: 'relative',
              width: '100%',
              height: '80px',
              background: 'var(--bg-app)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              overflow: 'auto',
            }}
          >
            <div style={{ minWidth: '4000px', minHeight: '100%', position: 'relative' }}>
              <PlayheadComponent engine={engine} ppf={10} />
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              fontFamily: 'var(--font-condensed)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: '6px',
            }}
          >
            Ruler Playhead (V3)
          </div>
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '60px',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}
          >
            <RulerPlayheadV3 currentTime={300} ppf={10} showLine duration={9000} />
          </div>
        </div>
      </div>
    );
  },
};
