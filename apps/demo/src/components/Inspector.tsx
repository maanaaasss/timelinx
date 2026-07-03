import React from 'react';
import type { TimelineEngine } from '@timelinx/react';
import { useSelectedClipIds, useClipWithEngine, useTimelineWithEngine } from '@timelinx/react';
import { Layers } from 'lucide-react';

interface InspectorProps {
  engine: TimelineEngine;
}

export function Inspector({ engine }: InspectorProps) {
  const selectedIds = useSelectedClipIds(engine);
  const timeline = useTimelineWithEngine(engine);
  const fps = (timeline?.fps as number) ?? 30;
  const selectedArray = Array.from(selectedIds);

  if (selectedArray.length === 0) {
    return (
      <div className="inspector-empty">
        <div className="inspector-empty-icon">
          <Layers size={18} strokeWidth={1.5} />
        </div>
        <div className="inspector-empty-label">No clip selected</div>
        <div className="inspector-empty-sub">Click a clip in the timeline</div>
      </div>
    );
  }

  if (selectedArray.length > 1) {
    return (
      <div className="inspector-empty">
        <div className="inspector-empty-label">{selectedArray.length} clips selected</div>
      </div>
    );
  }

  return <ClipInspector clipId={selectedArray[0]} engine={engine} fps={fps} />;
}

function ClipInspector({
  clipId,
  engine,
  fps,
}: {
  clipId: string;
  engine: TimelineEngine;
  fps: number;
}) {
  const clip = useClipWithEngine(engine, clipId);
  if (!clip) return null;

  const duration = (clip.timelineEnd as number) - (clip.timelineStart as number);
  const mediaDuration = (clip.mediaOut as number) - (clip.mediaIn as number);

  return (
    <div className="panel-stack">
      <Section title="Clip">
        <Row label="Name"     value={clip.name || (clipId as string).slice(0, 12)} />
        <Row label="ID"       value={(clipId as string).slice(0, 12)} dim />
      </Section>

      <Section title="Position">
        <Row label="Start"    value={`${clip.timelineStart}f  ${tc(clip.timelineStart as number, fps)}`} />
        <Row label="End"      value={`${clip.timelineEnd}f  ${tc(clip.timelineEnd as number, fps)}`} />
        <Row label="Duration" value={`${duration}f  ${tc(duration, fps)}`} />
      </Section>

      <Section title="Source">
        <Row label="In"       value={`${clip.mediaIn}f`} />
        <Row label="Out"      value={`${clip.mediaOut}f`} />
        <Row label="Length"   value={`${mediaDuration}f`} />
        <Row label="Asset"    value={(clip.assetId as string).slice(0, 16)} dim />
      </Section>

      <Section title="Properties">
        <Row label="Speed"    value={`${((clip.speed ?? 1) as number).toFixed(2)}×`} />
        <Row label="Reversed" value={clip.reversed ? 'Yes' : 'No'} />
        <Row label="Enabled"  value={clip.enabled !== false ? 'Yes' : 'No'} />
      </Section>

      {(clip.effects as any[])?.length > 0 && (
        <Section title={`Effects (${(clip.effects as any[]).length})`}>
          {(clip.effects as any[]).map((fx: any, i: number) => (
            <Row
              key={fx.id ?? i}
              label={fx.effectType ?? `FX ${i + 1}`}
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
    <div className="inspector-section">
      <div className="inspector-section-title">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, dim }: { label: string; value: string | number; dim?: boolean }) {
  return (
    <div className="inspector-row">
      <span className="inspector-label">{label}</span>
      <span className={`inspector-value${dim ? ' dim' : ''}`}>{String(value)}</span>
    </div>
  );
}

function tc(frames: number, fps: number): string {
  const totalSecs = Math.floor(frames / fps);
  const f = frames % fps;
  const s = totalSecs % 60;
  const m = Math.floor(totalSecs / 60) % 60;
  const h = Math.floor(totalSecs / 3600);
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

function pad(n: number) { return String(Math.max(0, n)).padStart(2, '0'); }
