import { useCallback, type ChangeEvent } from 'react';

export interface ZoomSliderProps {
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  onChange: (v: number) => void;
}

export function ZoomSlider({ value, min, max, defaultValue, onChange }: ZoomSliderProps) {
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
    <div className="tl-zoom-slider">
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
