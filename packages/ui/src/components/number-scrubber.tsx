import React, { useCallback, useRef, useState, useEffect } from 'react';

export interface NumberScrubberProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  shiftStep?: number;
  disabled?: boolean;
}

export const NumberScrubber = React.memo(function NumberScrubber({
  label,
  value,
  onChange,
  onCommit,
  min,
  max,
  step = 1,
  shiftStep = 10,
  disabled = false,
}: NumberScrubberProps) {
  const [localValue, setLocalValue] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const scrubStartX = useRef(0);
  const scrubStartValue = useRef(0);
  const hasMoved = useRef(false);

  // Sync local value when prop changes and not editing
  useEffect(() => {
    if (!isEditing && !isScrubbing) {
      setLocalValue(String(value));
    }
  }, [value, isEditing, isScrubbing]);

  const clampValue = useCallback(
    (v: number) => {
      let clamped = v;
      if (min !== undefined) clamped = Math.max(min, clamped);
      if (max !== undefined) clamped = Math.min(max, clamped);
      return clamped;
    },
    [min, max],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
      const num = Number(e.target.value);
      if (!isNaN(num)) {
        onChange(clampValue(num));
      }
    },
    [onChange, clampValue],
  );

  const commitValue = useCallback(
    (raw: string) => {
      const num = Number(raw);
      if (raw === '' || raw === '-' || isNaN(num)) {
        // Revert to current prop value
        setLocalValue(String(value));
        return;
      }
      const clamped = clampValue(num);
      setLocalValue(String(clamped));
      onCommit(clamped);
    },
    [value, clampValue, onCommit],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitValue(localValue);
        // Keep focus on input
        inputRef.current?.focus();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        // Revert to original value without committing
        setLocalValue(String(value));
        setIsEditing(false);
        inputRef.current?.blur();
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const currentNum = Number(localValue);
        if (isNaN(currentNum)) return;

        const increment = e.shiftKey ? shiftStep : step;
        const delta = e.key === 'ArrowUp' ? increment : -increment;
        const clamped = clampValue(currentNum + delta);

        setLocalValue(String(clamped));
        onChange(clamped);
        onCommit(clamped);
      }
    },
    [localValue, value, step, shiftStep, clampValue, onChange, onCommit, commitValue],
  );

  const handleFocus = useCallback(() => {
    setIsEditing(true);
    // Select all text on focus for easy replacement
    inputRef.current?.select();
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    commitValue(localValue);
  }, [localValue, commitValue]);

  // ── Scrub interaction ──

  const handleScrubStart = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;

      // Only start scrub on left button
      if (e.button !== 0) return;

      // If clicking on input, let normal editing happen
      if (e.target === inputRef.current) return;

      e.preventDefault();
      setIsScrubbing(true);
      hasMoved.current = false;
      scrubStartX.current = e.clientX;
      scrubStartValue.current = Number(localValue) || 0;

      // Capture pointer on the label for smooth dragging
      const target = labelRef.current || e.currentTarget;
      target.setPointerCapture(e.pointerId);
    },
    [disabled, localValue],
  );

  const handleScrubMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isScrubbing) return;

      const dx = e.clientX - scrubStartX.current;
      if (Math.abs(dx) > 2) {
        hasMoved.current = true;
      }

      // Acceleration: 1px = 1 unit, after 100px = 2 units per px
      const speed = Math.abs(dx) > 100 ? 2 : 1;
      const newValue = scrubStartValue.current + dx * speed;
      const clamped = clampValue(newValue);

      setLocalValue(String(Math.round(clamped * 100) / 100));
      onChange(clamped);
    },
    [isScrubbing, clampValue, onChange],
  );

  const handleScrubEnd = useCallback(
    (e: React.PointerEvent) => {
      if (!isScrubbing) return;

      setIsScrubbing(false);

      // Release pointer capture
      const target = labelRef.current || e.currentTarget;
      target.releasePointerCapture(e.pointerId);

      // Commit the final value
      const finalValue = clampValue(Number(localValue) || 0);
      setLocalValue(String(finalValue));
      onCommit(finalValue);

      // If we didn't move, focus the input for typing
      if (!hasMoved.current) {
        inputRef.current?.focus();
      }
    },
    [isScrubbing, localValue, clampValue, onCommit],
  );

  const handleLabelClick = useCallback(
    (e: React.MouseEvent) => {
      // If we didn't scrub, focus the input
      if (!hasMoved.current && !disabled) {
        inputRef.current?.focus();
      }
    },
    [disabled],
  );

  return (
    <div
      className={`number-scrubber${isScrubbing ? ' is-scrubbing' : ''}${disabled ? ' is-disabled' : ''}`}
    >
      <span
        ref={labelRef}
        className="number-scrubber-label"
        onPointerDown={handleScrubStart}
        onPointerMove={handleScrubMove}
        onPointerUp={handleScrubEnd}
        onClick={handleLabelClick}
        role="presentation"
      >
        {label}
      </span>
      <input
        ref={inputRef}
        type="text"
        className="number-scrubber-input"
        value={localValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        role="spinbutton"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number(localValue) || 0}
        inputMode="numeric"
      />
    </div>
  );
});
