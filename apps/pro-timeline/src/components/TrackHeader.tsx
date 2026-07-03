import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, Volume2, VolumeX } from 'lucide-react';

interface TrackHeaderProps {
  trackName: string;
  trackType: 'video' | 'audio';
  index: number;
}

export function TrackHeader({ trackName, trackType, index }: TrackHeaderProps) {
  const [muted, setMuted] = useState(false);
  const [solo, setSolo] = useState(false);
  const [locked, setLocked] = useState(false);
  const [visible, setVisible] = useState(true);

  const isVideo = trackType === 'video';

  return (
    <div className={`pro-track-header ${trackType}`}>
      <div className="pro-track-info">
        <span className="pro-track-name">{trackName}</span>
        <span className="pro-track-type">{isVideo ? 'Video' : 'Audio'}</span>
      </div>

      <div className="pro-track-controls">
        {isVideo && (
          <button
            className={`pro-track-btn${visible ? '' : ' off'}`}
            onClick={() => setVisible(!visible)}
            title={visible ? 'Hide track' : 'Show track'}
          >
            {visible ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
        )}

        {!isVideo && (
          <button
            className={`pro-track-btn${muted ? ' muted' : ''}`}
            onClick={() => setMuted(!muted)}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>
        )}

        {!isVideo && (
          <button
            className={`pro-track-btn${solo ? ' solo' : ''}`}
            onClick={() => setSolo(!solo)}
            title={solo ? 'Unsolo' : 'Solo'}
          >
            S
          </button>
        )}

        <button
          className={`pro-track-btn${locked ? ' locked' : ''}`}
          onClick={() => setLocked(!locked)}
          title={locked ? 'Unlock track' : 'Lock track'}
        >
          {locked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>
      </div>
    </div>
  );
}
