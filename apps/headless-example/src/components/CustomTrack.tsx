/**
 * CustomTrack — headless clip rendering
 *
 * Renders clips for a single track using only @timelinx/react hooks.
 * Each clip is a plain <div> with absolute positioning — no UI library needed.
 * Provisional state (ghost clips during drag) is handled inline.
 */
import { useClips, useTrack } from '@timelinx/react';
import type { ProvisionalState } from '@timelinx/core';
import type { TimelineFrame } from '@timelinx/core';

const TRACK_LABEL_WIDTH = 0;

interface CustomTrackProps {
  trackId: string;
  index: number;
  ppf: number;
  trackHeight: number;
  selectedClipIds: ReadonlySet<string>;
  provisional: ProvisionalState | null;
}

function frameToX(frame: TimelineFrame, ppf: number): number {
  return (frame as number) * ppf;
}

export function CustomTrack({
  trackId,
  index,
  ppf,
  trackHeight,
  selectedClipIds,
  provisional,
}: CustomTrackProps) {
  const track = useTrack(trackId);
  const clips = useClips(trackId);

  const isAudio = track?.type === 'audio';
  const bgColor = isAudio ? 'var(--tl-track-audio)' : 'var(--tl-track-video)';
  const clipColor = isAudio ? 'var(--tl-clip-audio)' : 'var(--tl-clip-video)';

  // Merge real clips with provisional ghosts
  const allClips = [...clips];
  if (provisional?.clips) {
    for (const ghost of provisional.clips) {
      if ((ghost.trackId as string) === trackId) {
        allClips.push(ghost as any);
      }
    }
  }

  return (
    <div
      className="headless-track-row"
      style={{
        height: trackHeight,
        top: index * trackHeight,
        background: bgColor,
      }}
    >
      {allClips.map((clip) => {
        const start = clip.timelineStart as number;
        const end = clip.timelineEnd as number;
        const left = frameToX(start as unknown as TimelineFrame, ppf);
        const width = frameToX(end as unknown as TimelineFrame, ppf) - left;
        const isSelected = selectedClipIds.has(clip.id as string);
        const isProvisional = provisional?.clips.some((g) => g.id === clip.id);

        return (
          <div
            key={clip.id}
            className={`headless-clip ${isSelected ? 'headless-clip-selected' : ''} ${isProvisional ? 'headless-clip-ghost' : ''}`}
            style={{
              left,
              width,
              backgroundColor: clipColor,
            }}
          >
            <span className="headless-clip-name">{clip.name}</span>
            {isSelected && <div className="headless-clip-selection-ring" />}
          </div>
        );
      })}
    </div>
  );
}
