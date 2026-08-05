import { useCallback, useRef, useState } from 'react';

/**
 * Hook for managing provisional (draft) values during direct manipulation.
 *
 * During interactions like drag or scrub, we update local state only.
 * The engine receives one dispatch on commit. This prevents undo-stack
 * bloat and keeps interactions at 60fps.
 *
 * @param committedValue - The current committed value from the engine
 * @param onCommit - Called once when the interaction ends with the final value
 * @returns [displayValue, start, update, commit, cancel]
 *
 * @example
 * ```tsx
 * const [x, startX, updateX, commitX, cancelX] = useProvisionalValue(
 *   transform.positionX.value,
 *   (v) => engine.dispatch({ ... }),
 * );
 *
 * // On pointer down
 * startX();
 *
 * // On pointer move
 * updateX(delta);
 *
 * // On pointer up
 * commitX();
 *
 * // On Escape
 * cancelX();
 * ```
 */
export function useProvisionalValue(
  committedValue: number,
  onCommit: (value: number) => void,
): [number, () => void, (delta: number) => void, () => void, () => void] {
  const [draft, setDraft] = useState<number | null>(null);
  const startValueRef = useRef(0);

  // The value to display: draft if active, otherwise committed
  const displayValue = draft !== null ? draft : committedValue;

  // Start a provisional interaction — capture the starting value
  const start = useCallback(() => {
    startValueRef.current = committedValue;
    setDraft(committedValue);
  }, [committedValue]);

  // Update the draft value by a delta from the start
  const update = useCallback((delta: number) => {
    setDraft(startValueRef.current + delta);
  }, []);

  // Commit the final value — triggers one engine dispatch
  const commit = useCallback(() => {
    if (draft !== null) {
      onCommit(draft);
      setDraft(null);
    }
  }, [draft, onCommit]);

  // Cancel the interaction — revert to committed value
  const cancel = useCallback(() => {
    setDraft(null);
  }, []);

  return [displayValue, start, update, commit, cancel];
}

/**
 * Hook for managing provisional transform values during drag.
 *
 * Tracks positionX and positionY as provisional values, keeping
 * other transform properties at their committed values.
 *
 * @param transform - The current committed clip transform
 * @param onCommit - Called once with the final transform on commit
 * @returns [draftTransform, startDrag, updateDrag, commitDrag, cancelDrag]
 */
export function useProvisionalTransform(
  transform: { positionX: { value: number }; positionY: { value: number } },
  onCommit: (positionX: number, positionY: number) => void,
): [
  { positionX: number; positionY: number },
  () => void,
  (dx: number, dy: number) => void,
  () => void,
  () => void,
] {
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });

  const displayX = draft !== null ? draft.x : transform.positionX.value;
  const displayY = draft !== null ? draft.y : transform.positionY.value;

  const startDrag = useCallback(() => {
    startPosRef.current = {
      x: transform.positionX.value,
      y: transform.positionY.value,
    };
    setDraft(startPosRef.current);
  }, [transform.positionX.value, transform.positionY.value]);

  const updateDrag = useCallback((dx: number, dy: number) => {
    setDraft({
      x: startPosRef.current.x + dx,
      y: startPosRef.current.y + dy,
    });
  }, []);

  const commitDrag = useCallback(() => {
    if (draft !== null) {
      onCommit(draft.x, draft.y);
      setDraft(null);
    }
  }, [draft, onCommit]);

  const cancelDrag = useCallback(() => {
    setDraft(null);
  }, []);

  return [
    { positionX: displayX, positionY: displayY },
    startDrag,
    updateDrag,
    commitDrag,
    cancelDrag,
  ];
}
