import React, { useState } from 'react';

export interface SilenceRegion {
  id: string;
  startMs: number;
  endMs: number;
  amplitude: number;
}

interface SilenceRemoverProps {
  silences: SilenceRegion[];
  onRemove: (ids: string[]) => void;
  onTrim: (id: string, startMs: number, endMs: number) => void;
  threshold: number;
  onThresholdChange: (value: number) => void;
  minDurationMs: number;
  onMinDurationChange: (ms: number) => void;
}

export function SilenceRemover({
  silences,
  onRemove,
  onTrim,
  threshold,
  onThresholdChange,
  minDurationMs,
  onMinDurationChange,
}: SilenceRemoverProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const formatTime = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSilenceMs = silences.reduce(
    (acc, s) => acc + (s.endMs - s.startMs),
    0,
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(silences.map((s) => s.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleRemoveSelected = () => {
    onRemove(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  return (
    <div className="silence-remover">
      <div className="silence-header">
        <span className="silence-title">Silence Detection</span>
        <span className="silence-count">{silences.length} regions</span>
      </div>

      <div className="silence-controls">
        <div className="silence-control-row">
          <label className="silence-label">Threshold (dB)</label>
          <input
            type="range"
            className="silence-slider"
            min={-60}
            max={-10}
            step={1}
            value={threshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
          />
          <span className="silence-value">{threshold} dB</span>
        </div>

        <div className="silence-control-row">
          <label className="silence-label">Min duration</label>
          <input
            type="range"
            className="silence-slider"
            min={100}
            max={5000}
            step={100}
            value={minDurationMs}
            onChange={(e) => onMinDurationChange(Number(e.target.value))}
          />
          <span className="silence-value">{formatTime(minDurationMs)}</span>
        </div>
      </div>

      <div className="silence-stats">
        <div className="silence-stat">
          <span className="silence-stat-label">Total silence</span>
          <span className="silence-stat-value">{formatTime(totalSilenceMs)}</span>
        </div>
        <div className="silence-stat">
          <span className="silence-stat-label">Regions found</span>
          <span className="silence-stat-value">{silences.length}</span>
        </div>
      </div>

      <div className="silence-actions">
        <button className="silence-btn" onClick={selectAll}>
          Select All
        </button>
        <button className="silence-btn" onClick={deselectAll}>
          Deselect
        </button>
        <button
          className="silence-btn danger"
          onClick={handleRemoveSelected}
          disabled={selectedIds.size === 0}
        >
          Remove ({selectedIds.size})
        </button>
      </div>

      <div className="silence-list">
        {silences.map((silence) => {
          const duration = silence.endMs - silence.startMs;
          const isSelected = selectedIds.has(silence.id);

          return (
            <div
              key={silence.id}
              className={`silence-region ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleSelect(silence.id)}
            >
              <div className="silence-region-info">
                <span className="silence-time">
                  {formatTime(silence.startMs)} — {formatTime(silence.endMs)}
                </span>
                <span className="silence-duration">{formatTime(duration)}</span>
              </div>
              <div className="silence-amplitude-bar">
                <div
                  className="silence-amplitude-fill"
                  style={{
                    width: `${Math.min(Math.abs(silence.amplitude) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}

        {silences.length === 0 && (
          <div className="silence-empty">
            <span>No silence regions detected</span>
          </div>
        )}
      </div>
    </div>
  );
}
