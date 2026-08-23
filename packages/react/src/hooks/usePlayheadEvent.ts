/**
 * usePlayheadEvent — Phase 6 Step 6
 *
 * Subscribe to specific playhead events without causing re-renders on every frame.
 * Handler is called only when event type matches.
 *
 * NOTE: handler is included in the useEffect deps array. If you pass an inline
 * function, the subscription will re-create on every parent render. Wrap your
 * handler in useCallback at the call site for stable subscriptions.
 */

import { useEffect } from 'react';
import type {
  PlaybackEngine,
  PlayheadEventType,
  PlayheadListener,
  PlayheadEvent,
} from '@timelinx/core';

export function usePlayheadEvent(
  engine: PlaybackEngine,
  eventType: PlayheadEventType | PlayheadEventType[],
  handler: PlayheadListener,
): void {
  useEffect(() => {
    const types = Array.isArray(eventType) ? eventType : [eventType];
    const unsub = engine.on((event: PlayheadEvent) => {
      if (types.includes(event.type)) handler(event);
    });
    return unsub;
  }, [engine, handler, eventType]);
}
