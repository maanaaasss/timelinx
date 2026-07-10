/**
 * DEPRECATED — Not used by the editor as of the text-clip pivot.
 *
 * Text clips now render via ClipView/GhostClip like any other clip.
 * Retained for reference only.
 */

import React from 'react';
import type { Caption } from '@timelinx/core';

interface GhostCaptionProps {
  caption: Caption;
  ppf: number;
}

export const GhostCaption = React.memo(function GhostCaption({ caption, ppf }: GhostCaptionProps) {
  const left = Number(caption.startFrame) * ppf;
  const width = Math.max(40, (Number(caption.endFrame) - Number(caption.startFrame)) * ppf);
  const duration = Number(caption.endFrame) - Number(caption.startFrame);

  return (
    <div
      className="caption-block ghost"
      style={{
        transform: `translateX(${left}px)`,
        width,
      }}
    >
      {width > 40 && (
        <div className="caption-info">{caption.text || 'Preview'}</div>
      )}
      {width > 80 && (
        <div className="caption-duration">
          {duration}fr @ {String(caption.startFrame)}
        </div>
      )}
    </div>
  );
});
