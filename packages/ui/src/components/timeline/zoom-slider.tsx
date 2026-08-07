import { useRef, useCallback, type ChangeEvent } from 'react';

export interface ZoomSliderProps {
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  onChange: (v: number) => void;
}

export function ZoomSlider({ value, min, max, defaultValue, onChange }: ZoomSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pct = ((value - min) / (max - min)) * 100;

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange],
  );

  const handleDoubleClick = useCallback(() => {
    onChange(defaultValue);
  }, [defaultValue, onChange]);

  return (
    <div className="tl-zoom-slider" ref={trackRef}>
      <input
        type="range"
        className="tl-zoom-slider-input"
        min={min}
        max={max}
        step={0.1}
        value={value}
        onChange={handleChange}
        onDoubleClick={handleDoubleClick}
        style={{ '--zoom-pct': `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
}
