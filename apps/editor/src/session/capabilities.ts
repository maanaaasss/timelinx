/**
 * Browser capability detection for the editor preflight (plan §6 P1, task 5).
 *
 * v1 targets desktop Chrome/Edge. Before the user can import or export, we check
 * the browser APIs the editor actually depends on and give an actionable message
 * instead of failing deep inside an import or export later.
 *
 * Pure module: no JSX and no side effects, so it is directly unit-testable by
 * passing a stub `CapabilityGlobals` in tests.
 */

export type CapabilityId =
  | 'canvas2d'
  | 'captureStream'
  | 'mediaRecorder'
  | 'audioContext'
  | 'webgl'; // informational only — Canvas2D compositor is the v1 renderer

export interface CapabilityResult {
  id: CapabilityId;
  label: string;
  /** Whether this capability is present. */
  ok: boolean;
  /** If true, the editor cannot function without it (blocks the app). */
  required: boolean;
  /** Human-readable consequence when missing. */
  detail: string;
}

export interface CapabilityReport {
  results: CapabilityResult[];
  /** True when every *required* capability is present. */
  supported: boolean;
  /** Required capabilities that are missing. */
  missingRequired: CapabilityResult[];
}

/**
 * The globals the detector inspects. Real callers pass `window`; tests pass a
 * partial stub. Everything is optional so a missing global reads as unsupported.
 */
export interface CapabilityGlobals {
  document?: {
    createElement(tag: string): unknown;
  };
  MediaRecorder?: unknown;
  AudioContext?: unknown;
  webkitAudioContext?: unknown;
}

function hasCanvas2d(g: CapabilityGlobals): boolean {
  try {
    const canvas = g.document?.createElement('canvas') as HTMLCanvasElement | undefined;
    return !!canvas && typeof canvas.getContext === 'function' && !!canvas.getContext('2d');
  } catch {
    return false;
  }
}

function hasCaptureStream(g: CapabilityGlobals): boolean {
  try {
    const canvas = g.document?.createElement('canvas') as HTMLCanvasElement | undefined;
    return (
      !!canvas &&
      typeof (canvas as { captureStream?: unknown }).captureStream === 'function'
    );
  } catch {
    return false;
  }
}

function hasWebgl(g: CapabilityGlobals): boolean {
  try {
    const canvas = g.document?.createElement('canvas') as HTMLCanvasElement | undefined;
    if (!canvas || typeof canvas.getContext !== 'function') return false;
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

/**
 * Evaluate all editor capabilities against the provided globals.
 * Defaults to the real `window` / `document` when called with no argument.
 */
export function detectCapabilities(
  globals: CapabilityGlobals = typeof window !== 'undefined'
    ? (window as unknown as CapabilityGlobals)
    : {},
): CapabilityReport {
  const results: CapabilityResult[] = [
    {
      id: 'canvas2d',
      label: 'Canvas 2D',
      ok: hasCanvas2d(globals),
      required: true,
      detail: 'The preview and export compositor render with the Canvas 2D API.',
    },
    {
      id: 'captureStream',
      label: 'Canvas captureStream',
      ok: hasCaptureStream(globals),
      required: true,
      detail: 'Export records the preview canvas via HTMLCanvasElement.captureStream().',
    },
    {
      id: 'mediaRecorder',
      label: 'MediaRecorder',
      ok: typeof globals.MediaRecorder !== 'undefined',
      required: true,
      detail: 'Export encodes video/audio through the MediaRecorder API.',
    },
    {
      id: 'audioContext',
      label: 'Web Audio',
      ok:
        typeof globals.AudioContext !== 'undefined' ||
        typeof globals.webkitAudioContext !== 'undefined',
      required: true,
      detail: 'Audio playback and export mixing require an AudioContext.',
    },
    {
      id: 'webgl',
      label: 'WebGL',
      ok: hasWebgl(globals),
      required: false,
      detail: 'Not used by the v1 Canvas 2D renderer; reported for diagnostics only.',
    },
  ];

  const missingRequired = results.filter((r) => r.required && !r.ok);
  return {
    results,
    missingRequired,
    supported: missingRequired.length === 0,
  };
}
