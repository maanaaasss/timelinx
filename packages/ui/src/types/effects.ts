export type EffectParam = {
  readonly key: string;
  readonly value: number | string | boolean;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
};

export type Keyframe = {
  readonly id: string;
  readonly frame: number;
  readonly value: number;
  readonly easing?: string;
};

export type Effect = {
  readonly id: string;
  readonly effectType: string;
  readonly stage: 'preComposite' | 'postComposite';
  readonly renderStage?: 'preComposite' | 'postComposite';
  readonly enabled: boolean;
  readonly params: readonly EffectParam[];
  readonly keyframes?: readonly Keyframe[];
};

export function createEffect(
  id: string,
  effectType: string,
  stage: 'preComposite' | 'postComposite' = 'preComposite',
): Effect {
  return {
    id,
    effectType,
    stage,
    renderStage: stage,
    enabled: true,
    params: [
      {
        key: 'intensity',
        value:
          effectType === 'brightness' || effectType === 'contrast' || effectType === 'saturation'
            ? 1
            : 0,
      },
    ],
    keyframes: [],
  };
}
