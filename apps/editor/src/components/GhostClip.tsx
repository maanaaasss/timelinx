import type { Clip } from '@timelinx/core';

interface GhostClipProps {
  clip: Clip;
  ppf: number;
  trackType: string;
}

export function GhostClip({ clip, ppf, trackType }: GhostClipProps) {
  const left = Number(clip.timelineStart) * ppf;
  const width = Math.max(40, (Number(clip.timelineEnd) - Number(clip.timelineStart)) * ppf);
  const duration = Number(clip.timelineEnd) - Number(clip.timelineStart);

  return (
    <div
      className={`clip ${trackType} ghost`}
      style={{
        transform: `translateX(${left}px)`,
        width,
      }}
    >
      {width > 40 && (
        <div className="clip-info">{clip.id} (preview)</div>
      )}
      {width > 80 && (
        <div className="clip-duration">
          {duration}fr @ {String(clip.timelineStart)}
        </div>
      )}
    </div>
  );
}
