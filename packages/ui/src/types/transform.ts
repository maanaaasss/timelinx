import type { Clip } from '@timelinx/core';

export type AnimatableProperty<T = number> = {
  readonly value: T;
  readonly keyframes?: readonly unknown[];
};

export type ClipTransform = {
  readonly positionX: AnimatableProperty<number>;
  readonly positionY: AnimatableProperty<number>;
  readonly scaleX: AnimatableProperty<number>;
  readonly scaleY: AnimatableProperty<number>;
  readonly rotation: AnimatableProperty<number>;
  readonly opacity: AnimatableProperty<number>;
  readonly anchorX: AnimatableProperty<number>;
  readonly anchorY: AnimatableProperty<number>;
};

export const DEFAULT_CLIP_TRANSFORM: ClipTransform = {
  positionX: { value: 0 },
  positionY: { value: 0 },
  scaleX: { value: 1 },
  scaleY: { value: 1 },
  rotation: { value: 0 },
  opacity: { value: 1 },
  anchorX: { value: 0.5 },
  anchorY: { value: 0.5 },
};

export function getClipTransform(clip: Clip): ClipTransform {
  return (clip.metadata?.transform as ClipTransform | undefined) ?? DEFAULT_CLIP_TRANSFORM;
}
