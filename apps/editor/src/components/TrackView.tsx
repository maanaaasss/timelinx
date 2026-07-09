import React from 'react';
import { useTrack, useProvisional } from '@timelinx/react';
import type { Clip, Caption } from '@timelinx/core';
import { ClipView } from './ClipView';
import { GhostClip } from './GhostClip';
import { GhostCaption } from './GhostCaption';

interface TrackViewProps {
  trackId: string;
  ppf: number;
  selectedClipIds: ReadonlySet<string>;
  selectedCaptionIds: ReadonlySet<string>;
}

const CaptionBlock = React.memo(function CaptionBlock({ caption, ppf, trackId, isSelected, isTargeted }: { caption: Caption; ppf: number; trackId: string; isSelected: boolean; isTargeted: boolean }) {
  const left = Number(caption.startFrame) * ppf;
  const width = Math.max(40, (Number(caption.endFrame) - Number(caption.startFrame)) * ppf);
  const duration = Number(caption.endFrame) - Number(caption.startFrame);
  return (
    <div
      className={`caption-block${isSelected ? ' selected' : ''}${isTargeted ? ' targeted' : ''}`}
      data-caption-id={caption.id}
      data-track-id={trackId}
      style={{
        transform: `translateX(${left}px)`,
        width,
      }}
    >
      {width > 40 && (
        <div className="caption-info">{caption.text}</div>
      )}
      {width > 80 && (
        <div className="caption-duration">
          {duration}fr @ {String(caption.startFrame)}
        </div>
      )}
    </div>
  );
});

export function TrackView({ trackId, ppf, selectedClipIds, selectedCaptionIds }: TrackViewProps) {
  const track = useTrack(trackId);
  const provisional = useProvisional();

  if (!track) return null;

  const ghostMap = new Map<string, Clip>();
  const targetedIds = new Set<string>();
  const ghostCaptions: Caption[] = [];
  const targetedCaptionIds = new Set<string>();
  if (provisional && provisional.clips.length > 0) {
    for (const c of provisional.clips) {
      if (c.trackId === trackId) {
        ghostMap.set(c.id, c as Clip);
        targetedIds.add(c.id);
      }
    }
  }
  if (provisional && provisional.captions && provisional.captions.length > 0) {
    for (const c of provisional.captions) {
      const ghostTrackId = (c as any)._trackId as string | undefined;
      if (ghostTrackId === trackId || !ghostTrackId) {
        ghostCaptions.push(c);
        targetedCaptionIds.add(c.id);
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
          <CaptionBlock
            key={caption.id}
            caption={caption}
            ppf={ppf}
            trackId={trackId}
            isSelected={selectedCaptionIds.has(caption.id)}
            isTargeted={targetedCaptionIds.has(caption.id)}
          />
        ))}
        {ghostCaptions.map((ghost) => (
          <GhostCaption key={`ghost-${ghost.id}`} caption={ghost} ppf={ppf} />
        ))}
      </div>
    </div>
  );
}
