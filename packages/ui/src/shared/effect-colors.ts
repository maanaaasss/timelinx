/** Effect type → color mapping shared across timeline components. */
export const EFFECT_TYPE_COLORS: Record<string, string> = {
  blur: '#60a5fa',
  brightness: '#fbbf24',
  contrast: '#a78bfa',
  saturation: '#f472b6',
  hueRotate: '#34d399',
  colorCorrect: '#2dd4bf',
};

const DEFAULT_EFFECT_COLOR = '#6b7280';

export function getEffectColor(effectType: string): string {
  return EFFECT_TYPE_COLORS[effectType] ?? DEFAULT_EFFECT_COLOR;
}
