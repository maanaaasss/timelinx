import React, { useCallback } from 'react';
import type { TimelineEngine } from '@timelinx/react';
import { useSelectedClipIds, useClipWithEngine, useTimelineWithEngine, usePlayheadFrame } from '@timelinx/react';
import { Search } from 'lucide-react';

interface InspectorProps {
  engine: TimelineEngine;
}

export function Inspector({ engine }: InspectorProps) {
  const selectedIds = useSelectedClipIds(engine);
  const timeline = useTimelineWithEngine(engine);
  const frame = usePlayheadFrame(engine);

  const selectedArray = Array.from(selectedIds);

  if (selectedArray.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 56,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 14,
          marginBottom: 14,
          color: 'rgba(255,255,255,0.15)',
        }}>
          <Search size={24} strokeWidth={1.5} />
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
          No clip selected
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
          Click a clip to view details
        </div>
      </div>
    );
  }

  if (selectedArray.length > 1) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 20px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          {selectedArray.length} clips selected
        </div>
      </div>
    );
  }

  return <ClipInspector clipId={selectedArray[0]} engine={engine} />;
}

function ClipInspector({ clipId, engine }: { clipId: string; engine: TimelineEngine }) {
  const clip = useClipWithEngine(engine, clipId);
  const timeline = useTimelineWithEngine(engine);
  const fps = timeline?.fps ?? 30;

  if (!clip) return null;

  const duration = (clip.timelineEnd as number) - (clip.timelineStart as number);
  const mediaDuration = (clip.mediaOut as number) - (clip.mediaIn as number);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Section title="Clip">
        <Field label="Name" value={clip.name || (clipId as string).slice(0, 8)} />
        <Field label="ID" value={(clipId as string).slice(0, 12)} dim />
      </Section>

      <Section title="Timeline Position">
        <Field label="Start" value={`${clip.timelineStart}f (${formatTime(clip.timelineStart as number, fps)})`} />
        <Field label="End" value={`${clip.timelineEnd}f (${formatTime(clip.timelineEnd as number, fps)})`} />
        <Field label="Duration" value={`${duration}f (${formatTime(duration, fps)})`} />
      </Section>

      <Section title="Media">
        <Field label="In" value={`${clip.mediaIn}f`} />
        <Field label="Out" value={`${clip.mediaOut}f`} />
        <Field label="Length" value={`${mediaDuration}f`} />
        <Field label="Asset" value={(clip.assetId as string).slice(0, 12)} dim />
      </Section>

      <Section title="Properties">
        <Field label="Speed" value={`${(clip.speed ?? 1).toFixed(2)}x`} />
        <Field label="Reversed" value={clip.reversed ? 'Yes' : 'No'} />
        <Field label="Enabled" value={clip.enabled !== false ? 'Yes' : 'No'} />
      </Section>

      {clip.effects && clip.effects.length > 0 && (
        <Section title={`Effects (${clip.effects.length})`}>
          {clip.effects.map((fx: any, i: number) => (
            <Field
              key={fx.id ?? i}
              label={fx.effectType ?? `Effect ${i + 1}`}
              value={fx.enabled !== false ? 'On' : 'Off'}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'rgba(255,255,255,0.3)',
        marginBottom: 10,
        paddingBottom: 6,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: 12,
      padding: '3px 0',
    }}>
      <span style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
      <span style={{
        color: dim ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.65)',
        fontFamily: '"SF Mono", "JetBrains Mono", monospace',
        fontSize: 11,
      }}>
        {value}
      </span>
    </div>
  );
}

function formatTime(frames: number, fps: number): string {
  const totalSeconds = Math.floor(frames / fps);
  const f = frames % fps;
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}
