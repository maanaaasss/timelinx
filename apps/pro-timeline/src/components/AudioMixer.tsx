import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  color: string;
}

const DEFAULT_CHANNELS: Channel[] = [
  { id: 'ch-1', name: 'A1 · Music', volume: 75, pan: 0, muted: false, solo: false, color: 'var(--pro-audio-1)' },
  { id: 'ch-2', name: 'A2 · Voice', volume: 85, pan: 0, muted: false, solo: false, color: 'var(--pro-audio-2)' },
  { id: 'ch-3', name: 'A3 · SFX', volume: 60, pan: -20, muted: false, solo: false, color: 'var(--pro-audio-3)' },
  { id: 'ch-4', name: 'A4 · Ambience', volume: 40, pan: 30, muted: true, solo: false, color: 'var(--pro-audio-4)' },
  { id: 'ch-master', name: 'Master', volume: 80, pan: 0, muted: false, solo: false, color: 'var(--pro-accent)' },
];

export function AudioMixer() {
  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS);

  const updateChannel = (id: string, patch: Partial<Channel>) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, ...patch } : ch))
    );
  };

  const master = channels.find((ch) => ch.id === 'ch-master')!;

  return (
    <div className="pro-audio-mixer">
      <div className="pro-mixer-channels">
        {channels.map((ch) => {
          const isMaster = ch.id === 'ch-master';
          return (
            <div key={ch.id} className={`pro-mixer-channel${isMaster ? ' master' : ''}`}>
              <span className="pro-mixer-channel-name">{ch.name}</span>

              <div className="pro-mixer-meter">
                <div className="pro-meter-fill" style={{ height: `${ch.muted ? 0 : ch.volume}%`, background: ch.color }} />
              </div>

              <div className="pro-mixer-fader">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={ch.volume}
                  onChange={(e) => updateChannel(ch.id, { volume: +e.target.value })}
                  className="pro-fader"
                />
              </div>

              <span className="pro-mixer-value">{ch.volume}</span>

              {!isMaster && (
                <div className="pro-mixer-pan">
                  <span className="pro-pan-label">L</span>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={ch.pan}
                    onChange={(e) => updateChannel(ch.id, { pan: +e.target.value })}
                    className="pro-slider pro-slider-sm"
                  />
                  <span className="pro-pan-label">R</span>
                </div>
              )}

              <div className="pro-mixer-btns">
                {!isMaster && (
                  <>
                    <button
                      className={`pro-mixer-btn${ch.solo ? ' solo' : ''}`}
                      onClick={() => updateChannel(ch.id, { solo: !ch.solo })}
                    >
                      S
                    </button>
                    <button
                      className={`pro-mixer-btn${ch.muted ? ' muted' : ''}`}
                      onClick={() => updateChannel(ch.id, { muted: !ch.muted })}
                    >
                      {ch.muted ? <VolumeX size={10} /> : <Volume2 size={10} />}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
