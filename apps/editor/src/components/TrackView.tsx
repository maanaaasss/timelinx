import { useTrack, useProvisional } from '@timelinx/react';
import type { Clip, Caption } from '@timelinx/core';
import { ClipView } from './ClipView';
import { GhostClip } from './GhostClip';

interface TrackViewProps {
  trackId: string;
  ppf: number;
  selectedClipIds: ReadonlySet<string>;
}

function CaptionBlock({ caption, ppf }: { caption: Caption; ppf: number }) {
  const left = Number(caption.startFrame) * ppf;
  const width = Math.max(40, (Number(caption.endFrame) - Number(caption.startFrame)) * ppf);
  return (
    <div
      className="caption-block"
      data-caption-id={caption.id}
      style={{
        transform: `translateX(${left}px)`,
        width,
      }}
    >
      <div className="caption-text">{caption.text}</div>
    </div>
  );
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

  const captions = track.captions ?? [];

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
        {captions.map((caption) => (
          <CaptionBlock key={caption.id} caption={caption} ppf={ppf} />
        ))}
      </div>
    </div>
  );
}
