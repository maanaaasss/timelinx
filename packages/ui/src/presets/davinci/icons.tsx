/**
 * Tabler-based SVG icon components for the DaVinci preset.
 *
 * Sources: Tabler Icons (outline style, 24×24, stroke-1.5, round-cap).
 * Missing icons (playback, zoom, trim) are hand-drawn in the same style.
 */
import React from 'react';

type IconProps = { size?: number; color?: string; strokeWidth?: number };

const defaults = { size: 16, color: 'currentColor', strokeWidth: 1.5 };

function svgProps(p: IconProps) {
  const s = p.size ?? defaults.size;
  const c = p.color ?? defaults.color;
  const sw = p.strokeWidth ?? defaults.strokeWidth;
  return {
    xmlns: 'http://www.w3.org/2000/svg',
    width: s,
    height: s,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: c,
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': 'true' as const,
    style: { display: 'block' } as React.CSSProperties,
  };
}

// ── Tool icons ─────────────────────────────────────────────────────────────

export function IconPointer(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M6 3l12 9l-6.5 1.2l-3.1 5.8z" />
    </svg>
  );
}

export function IconScissors(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M15 3v5" />
      <path d="M15 8h5" />
      <path d="M15 3h-5" />
      <path d="M10 8v-5" />
      <path d="M10 13h-7" />
      <path d="M20 13h-7" />
      <path d="M10 18v-5" />
      <path d="M15 18v-5" />
    </svg>
  );
}

export function IconRippleTrim(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M3 12h18" />
      <path d="M3 12l3 -3" />
      <path d="M3 12l3 3" />
      <path d="M21 12l-3 -3" />
      <path d="M21 12l-3 3" />
    </svg>
  );
}

export function IconRollTrim(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 3v18" />
      <path d="M12 3l-3 3" />
      <path d="M12 3l3 3" />
      <path d="M12 21l-3 -3" />
      <path d="M12 21l3 -3" />
    </svg>
  );
}

export function IconSlip(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M4 12h16" />
      <path d="M4 12l3 -3" />
      <path d="M4 12l3 3" />
      <path d="M20 12l-3 -3" />
      <path d="M20 12l-3 3" />
    </svg>
  );
}

export function IconSlide(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 4v16" />
      <path d="M12 4l-3 3" />
      <path d="M12 4l3 3" />
      <path d="M12 20l-3 -3" />
      <path d="M12 20l3 -3" />
    </svg>
  );
}

export function IconHand(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M8 13v-8.5a1.5 1.5 0 0 1 3 0v7.5" />
      <path d="M11 11.5v-2a1.5 1.5 0 0 1 3 0v2.5" />
      <path d="M14 10.5a1.5 1.5 0 0 1 3 0v1.5" />
      <path d="M17 11.5a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7L7 19c-.667 -1.333 -1.333 -2.667 -2 -4" />
      <path d="M7 15c-1.5 -2 -3 -4 -3 -6" />
    </svg>
  );
}

// ── Playback icons ─────────────────────────────────────────────────────

export function IconPlayerPlay(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M7 4v16l13 -8z" />
    </svg>
  );
}

export function IconPlayerPause(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M6 5h2v14h-2z" />
      <path d="M16 5h2v14h-2z" />
    </svg>
  );
}

// ── Edit icons ─────────────────────────────────────────────────────────

export function IconUndo(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M9 14l-4 -4l4 -4" />
      <path d="M5 10h11a4 4 0 1 1 0 8h-1" />
    </svg>
  );
}

export function IconRedo(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M15 14l4 -4l-4 -4" />
      <path d="M19 10h-11a4 4 0 1 0 0 8h1" />
    </svg>
  );
}

// ── Zoom icons ─────────────────────────────────────────────────────────

export function IconZoomIn(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
      <path d="M7 10h6" />
      <path d="M10 7v6" />
      <path d="M21 21l-6 -6" />
    </svg>
  );
}

export function IconZoomOut(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
      <path d="M7 10h6" />
      <path d="M21 21l-6 -6" />
    </svg>
  );
}

// ── UI icons ───────────────────────────────────────────────────────────

export function IconLock(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6z" />
      <path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" />
      <path d="M8 11v-4a4 4 0 1 1 8 0v4" />
    </svg>
  );
}

export function IconLockOpen(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6z" />
      <path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" />
      <path d="M8 11v-4a4 4 0 1 1 8 0" />
    </svg>
  );
}

export function IconEye(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
      <path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" />
    </svg>
  );
}

export function IconEyeOff(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M10.585 10.587a2 2 0 0 0 2.829 2.828" />
      <path d="M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 3.075 -3.822 5.341 -4.974" />
      <path d="M19.5 14.5l-1.9 -1.9" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function IconX(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

export function IconPlus(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 5l0 14" />
      <path d="M5 12l14 0" />
    </svg>
  );
}

export function IconMusic(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M3 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
      <path d="M13 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
      <path d="M9 17v-13l12 2v0" />
    </svg>
  );
}

export function IconFilm(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
      <path d="M8 4l0 16" />
      <path d="M16 4l0 16" />
      <path d="M4 8l4 0" />
      <path d="M4 16l4 0" />
      <path d="M4 12l16 0" />
      <path d="M16 8l4 0" />
      <path d="M16 16l4 0" />
    </svg>
  );
}

export function IconHeadphones(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M3 14v-3a9 9 0 1 1 18 0v3" />
      <path d="M3 14l2.5 4a1.5 1.5 0 0 0 2.5 1l2 -1.5l2 1.5a1.5 1.5 0 0 0 2.5 -1l2.5 -4" />
    </svg>
  );
}

export function IconVolume(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M15 8a5 5 0 0 1 0 8" />
      <path d="M17.7 5a9 9 0 0 1 0 14" />
      <path d="M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 -.5l-3.5 -4.5" />
    </svg>
  );
}

export function IconVolumeOff(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M15 8a5 5 0 0 1 1.912 4.934m-1.377 2.602a5 5 0 0 1 -.535 .464" />
      <path d="M17.7 5a9 9 0 0 1 2.362 11.086m-1.676 2.299a9 9 0 0 1 -.686 .615" />
      <path d="M9.069 5.054l.931 -.931a1 1 0 0 1 1.414 0l3.586 3.586a1 1 0 0 1 0 1.414l-.931 .931" />
      <path d="M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function IconSpeakerphone(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M3 17l6 -6l4 4l8 -8" />
      <path d="M14 7l7 0l0 7" />
    </svg>
  );
}

// ── Exports (all icons keyed by tool id) ───────────────────────────────

export const TOOL_ICONS: Record<string, (p: IconProps) => React.JSX.Element> = {
  selection: IconPointer,
  razor: IconScissors,
  'ripple-trim': IconRippleTrim,
  'roll-trim': IconRollTrim,
  slip: IconSlip,
  slide: IconSlide,
  hand: IconHand,
};
