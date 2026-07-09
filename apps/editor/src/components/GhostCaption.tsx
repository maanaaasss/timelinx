import type { Caption } from '@timelinx/core';

interface GhostCaptionProps {
  caption: Caption;
  ppf: number;
}

export function GhostCaption({ caption, ppf }: GhostCaptionProps) {
  const left = Number(caption.startFrame) * ppf;
  const width = Math.max(40, (Number(caption.endFrame) - Number(caption.startFrame)) * ppf);

  return (
    <div
      className="caption-block ghost"
      style={{
        transform: `translateX(${left}px)`,
        width,
      }}
    >
      <span className="caption-text">Preview</span>
    </div>
  );
}
