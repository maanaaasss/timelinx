import React from 'react';
import { useClip } from '@timelinx/react';

interface ClipViewProps {
  clipId: string;
  ppf: number;
  isSelected: boolean;
  isTargeted: boolean;
  ghost: boolean;
  trackType: string;
}

export const ClipView = React.memo(function ClipView({
  clipId,
  ppf,
  isSelected,
  isTargeted,
  ghost,
  trackType,
}: ClipViewProps) {
  const clip = useClip(clipId);
  if (!clip) return null;

  const left = Number(clip.timelineStart) * ppf;
  const width = Math.max(40, (Number(clip.timelineEnd) - Number(clip.timelineStart)) * ppf);
  const duration = Number(clip.timelineEnd) - Number(clip.timelineStart);

  return (
    <div
      className={`clip ${trackType}${isSelected ? ' selected' : ''}${isTargeted ? ' targeted' : ''}${ghost ? ' ghost' : ''}`}
      data-clip-id={clipId}
      data-track-id={clip.trackId}
      style={{
        transform: `translateX(${left}px)`,
        width,
      }}
    >
      {width > 40 && (
        <div className="clip-info">{clip.name ?? clipId}</div>
      )}
      {width > 80 && (
        <div className="clip-duration">
          {duration}fr @ {String(clip.timelineStart)}
        </div>
      )}
    </div>
  );
});
