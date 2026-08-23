import { describe, it, expect } from 'vitest';
import { detectCapabilities, type CapabilityGlobals } from '../session/capabilities';

/** Build stub globals with a canvas that supports the given context types. */
function stubGlobals(opts: {
  contexts?: string[];
  captureStream?: boolean;
  mediaRecorder?: boolean;
  audioContext?: boolean;
}): CapabilityGlobals {
  const { contexts = [], captureStream = false } = opts;
  const globals: CapabilityGlobals = {
    document: {
      createElement: () => {
        const el: Record<string, unknown> = {
          getContext: (type: string) => (contexts.includes(type) ? {} : null),
        };
        if (captureStream) el.captureStream = () => ({});
        return el;
      },
    },
  };
  if (opts.mediaRecorder) globals.MediaRecorder = class {};
  if (opts.audioContext) globals.AudioContext = class {};
  return globals;
}

describe('detectCapabilities', () => {
  it('reports supported when all required capabilities exist', () => {
    const report = detectCapabilities(
      stubGlobals({
        contexts: ['2d', 'webgl'],
        captureStream: true,
        mediaRecorder: true,
        audioContext: true,
      }),
    );

    expect(report.supported).toBe(true);
    expect(report.missingRequired).toHaveLength(0);
  });

  it('flags missing MediaRecorder as an unsupported blocker', () => {
    const report = detectCapabilities(
      stubGlobals({ contexts: ['2d'], captureStream: true, audioContext: true }),
    );

    expect(report.supported).toBe(false);
    expect(report.missingRequired.map((r) => r.id)).toContain('mediaRecorder');
  });

  it('treats missing WebGL as non-blocking (diagnostic only)', () => {
    const report = detectCapabilities(
      stubGlobals({
        contexts: ['2d'], // no webgl
        captureStream: true,
        mediaRecorder: true,
        audioContext: true,
      }),
    );

    expect(report.supported).toBe(true);
    const webgl = report.results.find((r) => r.id === 'webgl');
    expect(webgl?.ok).toBe(false);
    expect(webgl?.required).toBe(false);
  });

  it('accepts webkitAudioContext as an AudioContext fallback', () => {
    const globals = stubGlobals({
      contexts: ['2d'],
      captureStream: true,
      mediaRecorder: true,
    });
    globals.webkitAudioContext = class {};

    const report = detectCapabilities(globals);
    expect(report.results.find((r) => r.id === 'audioContext')?.ok).toBe(true);
  });

  it('reports everything missing for empty globals', () => {
    const report = detectCapabilities({});
    expect(report.supported).toBe(false);
    // All four required capabilities missing.
    expect(report.missingRequired).toHaveLength(4);
  });
});
