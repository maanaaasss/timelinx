/**
 * TRANSITION MODEL — Phase 4
 *
 * Outgoing transition between clips (dissolve, wipe, etc.).
 */

export type TransitionId = string & { readonly __brand: 'TransitionId' };
export function toTransitionId(s: string): TransitionId {
  return s as TransitionId;
}

/** 'dissolve' | 'wipe' | 'dip' | host-defined. */
export type TransitionType = string;

export type TransitionAlignment =
  | 'centerOnCut' // straddles the cut point equally
  | 'endAtCut' // ends exactly at the cut point
  | 'startAtCut'; // starts exactly at the cut point

export type TransitionParam = {
  readonly key: string;
  readonly value: number | string | boolean;
};

export type Transition = {
  readonly id: TransitionId;
  readonly type: TransitionType;
  readonly durationFrames: number;
  readonly alignment: TransitionAlignment;
  readonly easing?: string;
  readonly params: readonly TransitionParam[];
};

export function createTransition(
  id: TransitionId,
  type: TransitionType,
  durationFrames: number,
  alignment: TransitionAlignment = 'centerOnCut',
  easing: string = 'linear',
  params: readonly TransitionParam[] = [],
): Transition {
  return { id, type, durationFrames, alignment, easing, params };
}
