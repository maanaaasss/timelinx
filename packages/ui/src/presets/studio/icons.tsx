/**
 * Broadcast Noir SVG icons — sharp, geometric, purposeful.
 *
 * Inspired by broadcast graphics and technical interfaces.
 * Crisp strokes, no decorative fills, angular where possible.
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
    strokeLinecap: 'square' as const,
    strokeLinejoin: 'miter' as const,
    'aria-hidden': 'true' as const,
    style: { display: 'block' } as React.CSSProperties,
  };
}

// ── Tool icons ─────────────────────────────────────────────────────────────

export function IconPointer(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path d="M5 3l4 18 4-8 8-4z" />
    </svg>
  );
}

export function IconScissors(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <line x1="20" y1="4" x2="8.5" y2="15.5" />
      <line x1="14" y1="14" x2="20" y2="20" />
      <line x1="8.5" y1="8.5" x2="12" y2="12" />
    </svg>
  );
}

export function IconRippleTrim(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <line x1="2" y1="12" x2="22" y2="12" />
      <polyline points="6,8 2,12 6,16" />
      <polyline points="18,8 22,12 18,16" />
    </svg>
  );
}

export function IconRollTrim(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <line x1="12" y1="2" x2="12" y2="22" />
      <polyline points="8,6 12,2 16,6" />
      <polyline points="8,18 12,22 16,18" />
    </svg>
  );
}

export function IconSlip(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <line x1="2" y1="12" x2="22" y2="12" />
      <polyline points="6,8 2,12 6,16" />
      <polyline points="18,8 22,12 18,16" />
    </svg>
  );
}

export function IconSlide(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <line x1="12" y1="2" x2="12" y2="22" />
      <polyline points="8,6 12,2 16,6" />
      <polyline points="8,18 12,22 16,18" />
    </svg>
  );
}

export function IconHand(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path d="M18 11V6a2 2 0 0 0-4 0v1" />
      <path d="M14 10V4a2 2 0 0 0-4 0v7" />
      <path d="M10 10.5V8a2 2 0 0 0-4 0v8c0 4 3 6 6 6h2c3 0 5-2 5-5v-5a2 2 0 0 0-4 0" />
    </svg>
  );
}

// ── Playback icons ─────────────────────────────────────────────────────

export function IconPlayerPlay(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <polygon points="7,4 20,12 7,20" />
    </svg>
  );
}

export function IconPlayerPause(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <rect x="5" y="4" width="4" height="16" />
      <rect x="15" y="4" width="4" height="16" />
    </svg>
  );
}

// ── Edit icons ─────────────────────────────────────────────────────────

export function IconUndo(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path d="M3 10h10a4 4 0 0 1 0 8H9" />
      <polyline points="7,6 3,10 7,14" />
    </svg>
  );
}

export function IconRedo(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path d="M21 10H11a4 4 0 0 0 0 8h4" />
      <polyline points="17,6 21,10 17,14" />
    </svg>
  );
}

// ── Zoom icons ─────────────────────────────────────────────────────────

export function IconZoomIn(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="11" cy="11" r="6" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
      <line x1="8" y1="11" x2="14" y2="11" />
      <line x1="11" y1="8" x2="11" y2="14" />
    </svg>
  );
}

export function IconZoomOut(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="11" cy="11" r="6" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

// ── UI icons ───────────────────────────────────────────────────────────

export function IconLock(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <rect x="5" y="11" width="14" height="10" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}

export function IconLockOpen(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <rect x="5" y="11" width="14" height="10" />
      <path d="M8 11V7a4 4 0 1 1 8 0" />
    </svg>
  );
}

export function IconEye(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEyeOff(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}

export function IconX(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function IconPlus(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function IconMusic(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

export function IconFilm(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <rect x="2" y="2" width="20" height="20" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
      <line x1="17" y1="17" x2="22" y2="17" />
    </svg>
  );
}

export function IconHeadphones(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <rect x="2" y="17" width="4" height="4" />
      <rect x="18" y="17" width="4" height="4" />
    </svg>
  );
}

export function IconVolume(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

export function IconVolumeOff(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

export function IconSpeakerphone(p: IconProps = {}) {
  return (
    <svg {...svgProps(p)}>
      <path d="M3 17l6-6 4 4 8-8" />
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
