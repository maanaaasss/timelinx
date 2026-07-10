import { useTrack, useProvisional } from '@timelinx/react';
import type { Clip } from '@timelinx/core';
import { ClipView } from './ClipView';
import { GhostClip } from './GhostClip';

interface TrackViewProps {
  trackId: string;
  ppf: number;
  selectedClipIds: ReadonlySet<string>;
}

export function TrackView({ trackId, ppf, selectedClipIds }: TrackViewProps) {
  const track = useTrack(trackId);
  const provisional = useProvisional();

  if (!track) return null;

  const ghostMap = new Map<string, Clip>();
  const targetedIds = new Set<string>();
  if (provisional && provisional.clips.length > 0) {
    for (const c of provisional.clips) {
      if (c.trackId === trackId) {
        ghostMap.set(c.id, c as Clip);
        targetedIds.add(c.id);
      }
    }
  }

  const trackTypeClass =
    track.type === 'audio'
      ? 'audio'
      : track.type === 'video'
      ? 'video'
      : 'title';

  return (
    <div
      className={`track${track.locked ? ' locked' : ''}${track.muted ? ' muted' : ''}`}
      data-track-id={trackId}
    >
      <div className="track-clips">
        {track.clips.map((clip) => (
          <ClipView
            key={clip.id}
            clipId={clip.id}
            ppf={ppf}
            isSelected={selectedClipIds.has(clip.id)}
            isTargeted={targetedIds.has(clip.id)}
            ghost={ghostMap.has(clip.id)}
            trackType={trackTypeClass}
          />
        ))}
        {[...ghostMap.values()].map((ghost) => (
          <GhostClip key={`ghost-${ghost.id}`} clip={ghost} ppf={ppf} trackType={trackTypeClass} />
        ))}
      </div>
    </div>
  );
}
