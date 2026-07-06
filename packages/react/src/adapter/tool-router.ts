/**
 * ToolRouter — Phase R Step 3
 *
 * Converts React pointer/keyboard events into engine events.
 * rAF throttle only on onPointerMove. Option Y: onPointerLeave
 * calls handlePointerUp then handlePointerLeave.
 */

import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { TimelineEngine } from '../engine';
import type { TimelinePointerEvent, TimelineKeyEvent, Modifiers, ClipId, TrackId } from '@timelinx/core';
import type { TimelineFrame } from '@timelinx/core';

export type ToolRouterOptions = {
  engine: TimelineEngine;
  getPixelsPerFrame: () => number;
  getScrollLeft?: () => number;
};

export type ToolRouterHandlers = {
  onPointerDown: (e: ReactPointerEvent) => void;
  onPointerMove: (e: ReactPointerEvent) => void;
  onPointerUp: (e: ReactPointerEvent) => void;
  onPointerLeave: (e: ReactPointerEvent) => void;
  onKeyDown: (e: ReactKeyboardEvent) => void;
  destroy: () => void;
};

function getScrollLeftDefault(): number {
  return 0;
}

const EDGE_HIT_PX = 8;

type PointerSnapshot = {
  clientX: number;
  clientY: number;
  buttons: number;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  target: EventTarget | null;
  currentTargetRect: DOMRect | null;
  currentTarget: EventTarget | null;
};

function snapshotPointerEvent(e: ReactPointerEvent): PointerSnapshot {
  return {
    clientX: e.clientX,
    clientY: e.clientY,
    buttons: e.buttons,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
    metaKey: e.metaKey,
    target: e.target,
    currentTargetRect: (e.currentTarget as HTMLElement | null)?.getBoundingClientRect?.() ?? null,
    currentTarget: e.currentTarget,
  };
}

function convertPointerEventFromSnapshot(
  snap: PointerSnapshot,
  getPixelsPerFrame: () => number,
  getScrollLeft: () => number,
): TimelinePointerEvent {
  const ppf = getPixelsPerFrame();
  const sl = getScrollLeft();
  const rect = snap.currentTargetRect;

  const x = rect ? snap.clientX - rect.left + sl : snap.clientX;
  const y = rect ? snap.clientY - rect.top : snap.clientY;

  const frame = Math.max(0, Math.round(x / ppf)) as TimelineFrame;

  let clipId: string | undefined;
  let trackId: string | undefined;
  let edge: 'left' | 'right' | 'none' = 'none';
  let clipEl: HTMLElement | null = null;

  let el: HTMLElement | null = snap.target as HTMLElement | null;
  const container = snap.currentTarget as HTMLElement | null;
  while (el && el !== container) {
    if (!clipId && el.dataset.clipId) {
      clipId = el.dataset.clipId;
      clipEl = el;
    }
    if (!trackId && el.dataset.trackId) {
      trackId = el.dataset.trackId;
    }
    if (clipId && trackId) break;
    el = el.parentElement;
  }

  if (clipId && clipEl) {
    const cr = clipEl.getBoundingClientRect();
    const localX = snap.clientX - cr.left;
    const thresh = Math.min(EDGE_HIT_PX, cr.width * 0.15);
    if (localX <= thresh) edge = 'left';
    else if (localX >= cr.width - thresh) edge = 'right';
  }

  return {
    frame,
    trackId: (trackId as TrackId) ?? null,
    clipId: (clipId as ClipId) ?? null,
    x,
    y,
    buttons: snap.buttons,
    shiftKey: snap.shiftKey,
    altKey: snap.altKey,
    metaKey: snap.metaKey,
    edge,
  };
}

function convertPointerEvent(
  e: ReactPointerEvent,
  getPixelsPerFrame: () => number,
  getScrollLeft: () => number,
): TimelinePointerEvent {
  return convertPointerEventFromSnapshot(
    snapshotPointerEvent(e),
    getPixelsPerFrame,
    getScrollLeft,
  );
}

function extractModifiers(e: ReactPointerEvent | ReactKeyboardEvent): Modifiers {
  return {
    shift: e.shiftKey,
    alt: e.altKey,
    ctrl: e.ctrlKey,
    meta: e.metaKey,
  };
}

function convertKeyEvent(e: ReactKeyboardEvent): TimelineKeyEvent {
  return {
    code: e.code,
    key: e.key,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
    metaKey: e.metaKey,
    ctrlKey: e.ctrlKey,
    repeat: e.repeat,
  };
}

export function createToolRouter(options: ToolRouterOptions): ToolRouterHandlers {
  const { engine } = options;
  const getScrollLeft = options.getScrollLeft ?? getScrollLeftDefault;
  const getPixelsPerFrame = options.getPixelsPerFrame;

  let rafId: number | null = null;
  let lastMoveSnapshot: PointerSnapshot | null = null;
  let lastModifiers: Modifiers | null = null;

  return {
    onPointerDown(e: ReactPointerEvent): void {
      const converted = convertPointerEvent(e, getPixelsPerFrame, getScrollLeft);
      engine.handlePointerDown(converted, extractModifiers(e));
    },

    onPointerMove(e: ReactPointerEvent): void {
      e.preventDefault();
      lastMoveSnapshot = snapshotPointerEvent(e);
      lastModifiers = extractModifiers(e);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (lastMoveSnapshot !== null && lastModifiers !== null) {
          const converted = convertPointerEventFromSnapshot(
            lastMoveSnapshot,
            getPixelsPerFrame,
            getScrollLeft,
          );
          engine.handlePointerMove(converted, lastModifiers);
        }
      });
    },

    onPointerUp(e: ReactPointerEvent): void {
      const converted = convertPointerEvent(e, getPixelsPerFrame, getScrollLeft);
      engine.handlePointerUp(converted, extractModifiers(e));
    },

    onPointerLeave(e: ReactPointerEvent): void {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastMoveSnapshot = null;
      lastModifiers = null;
      const converted = convertPointerEvent(e, getPixelsPerFrame, getScrollLeft);
      engine.handlePointerUp(converted, extractModifiers(e));
      engine.handlePointerLeave(converted);
    },

    onKeyDown(e: ReactKeyboardEvent): void {
      const converted = convertKeyEvent(e);
      const handled = engine.handleKeyDown(converted, extractModifiers(e));
      if (handled) e.preventDefault();
    },

    destroy(): void {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastMoveSnapshot = null;
      lastModifiers = null;
    },
  };
}
