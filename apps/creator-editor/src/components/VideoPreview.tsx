import React from 'react';
import type { Caption, Overlay } from '../App';

type VideoPreviewProps = {
  captions: Caption[];
  overlays: Overlay[];
  selectedCaption: string | null;
  selectedOverlay: string | null;
};

export function VideoPreview({
  captions,
  overlays,
  selectedCaption,
  selectedOverlay,
}: VideoPreviewProps) {
  return (
    <div className="video-preview-container">
      <div className="video-preview-frame">
        <div className="video-preview-canvas">
          <div className="video-preview-gradient" />

          <div className="video-preview-captions">
            {captions.map((caption) => (
              <div
                key={caption.id}
                className={`preview-caption caption-style-${caption.style} ${
                  selectedCaption === caption.id ? 'selected' : ''
                }`}
              >
                {caption.text}
              </div>
            ))}
          </div>

          <div className="video-preview-overlays">
            {overlays.map((overlay) => (
              <div
                key={overlay.id}
                className={`preview-overlay overlay-type-${overlay.type} ${
                  selectedOverlay === overlay.id ? 'selected' : ''
                }`}
                style={{
                  left: `${overlay.x}%`,
                  top: `${overlay.y}%`,
                  fontSize: `${overlay.size}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {overlay.content}
              </div>
            ))}
          </div>
        </div>

        <div className="video-preview-badge">
          <span>9:16</span>
          <span className="badge-dot" />
          <span>1080×1920</span>
        </div>
      </div>
    </div>
  );
}