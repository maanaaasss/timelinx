import { describe, it, expect } from 'vitest';
import {
  framesToSeconds,
  secondsToFrames,
  framesToTimecode,
  framesToMinutesSeconds,
  clampFrame,
  addFrames,
  subtractFrames,
  frameDuration,
} from '../utils/frame';
import { toFrame as frame, type TimelineFrame, type FrameRate } from '../types/frame';

const FPS_30: FrameRate = 30 as FrameRate;
const FPS_24: FrameRate = 24 as FrameRate;
const FPS_60: FrameRate = 60 as FrameRate;

// ---------------------------------------------------------------------------
// framesToSeconds
// ---------------------------------------------------------------------------

describe('framesToSeconds', () => {
  it('converts frames to seconds at 30fps', () => {
    expect(framesToSeconds(frame(0), FPS_30)).toBe(0);
    expect(framesToSeconds(frame(30), FPS_30)).toBe(1);
    expect(framesToSeconds(frame(15), FPS_30)).toBe(0.5);
    expect(framesToSeconds(frame(90), FPS_30)).toBe(3);
  });

  it('converts frames to seconds at 24fps', () => {
    expect(framesToSeconds(frame(24), FPS_24)).toBe(1);
    expect(framesToSeconds(frame(48), FPS_24)).toBe(2);
    expect(framesToSeconds(frame(12), FPS_24)).toBe(0.5);
  });

  it('returns fractional seconds for non-exact divisions', () => {
    expect(framesToSeconds(frame(1), FPS_30)).toBeCloseTo(1 / 30, 10);
    expect(framesToSeconds(frame(7), FPS_30)).toBeCloseTo(7 / 30, 10);
  });

  it('handles large frame counts', () => {
    expect(framesToSeconds(frame(18000), FPS_30)).toBe(600);
  });
});

// ---------------------------------------------------------------------------
// secondsToFrames
// ---------------------------------------------------------------------------

describe('secondsToFrames', () => {
  it('converts seconds to frames at 30fps', () => {
    expect(secondsToFrames(0, FPS_30)).toBe(frame(0));
    expect(secondsToFrames(1, FPS_30)).toBe(frame(30));
    expect(secondsToFrames(5, FPS_30)).toBe(frame(150));
  });

  it('rounds to nearest frame', () => {
    expect(secondsToFrames(0.5, FPS_30)).toBe(frame(15));
    expect(secondsToFrames(1.5, FPS_30)).toBe(frame(45));
    expect(secondsToFrames(0.1, FPS_30)).toBe(frame(3)); // 0.1 * 30 = 3
  });

  it('rounds 0.5 up (Math.round)', () => {
    // 0.5 seconds at 30fps = 15 frames exactly, no rounding needed
    expect(secondsToFrames(0.5, FPS_30)).toBe(frame(15));
    // 1/6 second at 30fps = 5 frames exactly
    expect(secondsToFrames(1 / 6, FPS_30)).toBe(frame(5));
  });

  it('converts at 24fps', () => {
    expect(secondsToFrames(1, FPS_24)).toBe(frame(24));
    expect(secondsToFrames(2.5, FPS_24)).toBe(frame(60));
  });
});

// ---------------------------------------------------------------------------
// framesToTimecode
// ---------------------------------------------------------------------------

describe('framesToTimecode', () => {
  it('formats 0 frames as 00:00:00:00', () => {
    expect(framesToTimecode(frame(0), FPS_30)).toBe('00:00:00:00');
  });

  it('formats frames within first second', () => {
    expect(framesToTimecode(frame(15), FPS_30)).toBe('00:00:00:15');
    expect(framesToTimecode(frame(29), FPS_30)).toBe('00:00:00:29');
  });

  it('formats exact seconds', () => {
    expect(framesToTimecode(frame(30), FPS_30)).toBe('00:00:01:00');
    expect(framesToTimecode(frame(60), FPS_30)).toBe('00:00:02:00');
  });

  it('formats minutes and seconds', () => {
    // 1 minute = 1800 frames at 30fps
    expect(framesToTimecode(frame(1800), FPS_30)).toBe('00:01:00:00');
    // 1 min 30 sec = 2700 frames
    expect(framesToTimecode(frame(2700), FPS_30)).toBe('00:01:30:00');
  });

  it('formats hours', () => {
    // 1 hour = 108000 frames at 30fps
    expect(framesToTimecode(frame(108000), FPS_30)).toBe('01:00:00:00');
  });

  it('formats complex timecodes', () => {
    // 2h 7m 15s 15f at 30fps
    // = 2*3600*30 + 7*60*30 + 15*30 + 15
    // = 216000 + 12600 + 450 + 15 = 229065
    const frames = frame(229065);
    expect(framesToTimecode(frames, FPS_30)).toBe('02:07:15:15');
  });

  it('pads single digits with leading zeros', () => {
    expect(framesToTimecode(frame(1), FPS_30)).toBe('00:00:00:01');
    expect(framesToTimecode(frame(61), FPS_30)).toBe('00:00:02:01');
  });

  it('works with 24fps', () => {
    expect(framesToTimecode(frame(0), FPS_24)).toBe('00:00:00:00');
    expect(framesToTimecode(frame(24), FPS_24)).toBe('00:00:01:00');
    expect(framesToTimecode(frame(48), FPS_24)).toBe('00:00:02:00');
    expect(framesToTimecode(frame(12), FPS_24)).toBe('00:00:00:12');
  });
});

// ---------------------------------------------------------------------------
// framesToMinutesSeconds
// ---------------------------------------------------------------------------

describe('framesToMinutesSeconds', () => {
  it('formats 0 frames as 0:00', () => {
    expect(framesToMinutesSeconds(frame(0), FPS_30)).toBe('0:00');
  });

  it('formats seconds only', () => {
    expect(framesToMinutesSeconds(frame(30), FPS_30)).toBe('0:01');
    expect(framesToMinutesSeconds(frame(900), FPS_30)).toBe('0:30');
  });

  it('formats minutes and seconds', () => {
    expect(framesToMinutesSeconds(frame(1800), FPS_30)).toBe('1:00');
    expect(framesToMinutesSeconds(frame(2700), FPS_30)).toBe('1:30');
    expect(framesToMinutesSeconds(frame(5400), FPS_30)).toBe('3:00');
  });

  it('pads seconds with leading zero', () => {
    expect(framesToMinutesSeconds(frame(61), FPS_30)).toBe('0:02');
  });

  it('truncates sub-second frames', () => {
    // 29 frames at 30fps = 0.966 seconds → 0:00
    expect(framesToMinutesSeconds(frame(29), FPS_30)).toBe('0:00');
  });
});

// ---------------------------------------------------------------------------
// clampFrame
// ---------------------------------------------------------------------------

describe('clampFrame', () => {
  it('returns value when within range', () => {
    expect(clampFrame(frame(50), frame(0), frame(100))).toBe(frame(50));
  });

  it('clamps to min when below', () => {
    expect(clampFrame(frame(-10), frame(0), frame(100))).toBe(frame(0));
    expect(clampFrame(frame(-1), frame(5), frame(10))).toBe(frame(5));
  });

  it('clamps to max when above', () => {
    expect(clampFrame(frame(150), frame(0), frame(100))).toBe(frame(100));
    expect(clampFrame(frame(11), frame(5), frame(10))).toBe(frame(10));
  });

  it('returns min/max when value equals boundary', () => {
    expect(clampFrame(frame(0), frame(0), frame(100))).toBe(frame(0));
    expect(clampFrame(frame(100), frame(0), frame(100))).toBe(frame(100));
  });

  it('works when min equals max (single value range)', () => {
    expect(clampFrame(frame(50), frame(50), frame(50))).toBe(frame(50));
    expect(clampFrame(frame(0), frame(50), frame(50))).toBe(frame(50));
  });
});

// ---------------------------------------------------------------------------
// addFrames
// ---------------------------------------------------------------------------

describe('addFrames', () => {
  it('adds two frames', () => {
    expect(addFrames(frame(10), frame(20))).toBe(frame(30));
  });

  it('handles zero', () => {
    expect(addFrames(frame(10), frame(0))).toBe(frame(10));
    expect(addFrames(frame(0), frame(10))).toBe(frame(10));
  });

  it('handles large values', () => {
    expect(addFrames(frame(100000), frame(200000))).toBe(frame(300000));
  });
});

// ---------------------------------------------------------------------------
// subtractFrames
// ---------------------------------------------------------------------------

describe('subtractFrames', () => {
  it('subtracts two frames', () => {
    expect(subtractFrames(frame(30), frame(10))).toBe(frame(20));
  });

  it('clamps to zero when result would be negative', () => {
    expect(subtractFrames(frame(10), frame(30))).toBe(frame(0));
    expect(subtractFrames(frame(5), frame(10))).toBe(frame(0));
  });

  it('returns zero when subtracting equal values', () => {
    expect(subtractFrames(frame(15), frame(15))).toBe(frame(0));
  });

  it('handles subtracting zero', () => {
    expect(subtractFrames(frame(10), frame(0))).toBe(frame(10));
  });
});

// ---------------------------------------------------------------------------
// frameDuration
// ---------------------------------------------------------------------------

describe('frameDuration', () => {
  it('calculates duration between two frames', () => {
    expect(frameDuration(frame(0), frame(100))).toBe(frame(100));
    expect(frameDuration(frame(50), frame(100))).toBe(frame(50));
  });

  it('returns zero for same frame', () => {
    expect(frameDuration(frame(50), frame(50))).toBe(frame(0));
  });

  it('returns negative for inverted order (caller responsibility)', () => {
    // frameDuration does NOT clamp — it's raw subtraction
    expect(frameDuration(frame(100), frame(50))).toBe(frame(-50));
  });

  it('handles large durations', () => {
    expect(frameDuration(frame(0), frame(18000))).toBe(frame(18000));
  });
});
