import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { formatMSS, frameToMSS } from '../shared/time';
import { TimelineRulerV3 } from '../components/timeline/timeline-ruler-v3';
import { RulerPlayheadV3 } from '../components/timeline/ruler-playhead-v3';
import { TimelineToolbarV3 } from '../components/timeline/timeline-toolbar-v3';

describe('formatMSS and frameToMSS', () => {
  it('formats seconds in M:SS format', () => {
    expect(formatMSS(0)).toBe('0:00');
    expect(formatMSS(1)).toBe('0:01');
    expect(formatMSS(7)).toBe('0:07');
    expect(formatMSS(59)).toBe('0:59');
    expect(formatMSS(60)).toBe('1:00');
    expect(formatMSS(65)).toBe('1:05');
    expect(formatMSS(125)).toBe('2:05');
  });

  it('converts frame number to M:SS based on fps', () => {
    expect(frameToMSS(0, 30)).toBe('0:00');
    expect(frameToMSS(30, 30)).toBe('0:01');
    expect(frameToMSS(210, 30)).toBe('0:07');
    expect(frameToMSS(1800, 30)).toBe('1:00');
  });
});

describe('RulerPlayheadV3', () => {
  it('renders geometric flat-topped tab handle and vertical line', () => {
    const onSeek = vi.fn();
    const { container } = render(
      <RulerPlayheadV3
        currentTime={30}
        ppf={10}
        duration={300}
        onSeek={onSeek}
      />,
    );

    const wrapper = container.querySelector('.tl-ruler-v3-playhead-wrapper');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveStyle({ left: '300px' });

    const handle = container.querySelector('.tl-ruler-v3-playhead-handle');
    expect(handle).toBeInTheDocument();

    const svg = container.querySelector('.tl-ruler-v3-playhead-svg');
    expect(svg).toBeInTheDocument();

    const line = container.querySelector('.tl-ruler-v3-playhead-line');
    expect(line).toBeInTheDocument();
  });
});

describe('TimelineRulerV3', () => {
  it('renders ruler track with canvas and playhead', () => {
    const onSeek = vi.fn();
    const { container } = render(
      <TimelineRulerV3
        fps={30}
        ppf={10}
        duration={210}
        currentTime={0}
        onSeek={onSeek}
      />,
    );

    const track = container.querySelector('.tl-ruler-v3-track');
    expect(track).toBeInTheDocument();

    const canvas = container.querySelector('.tl-ruler-v3-canvas');
    expect(canvas).toBeInTheDocument();

    const playhead = container.querySelector('.tl-ruler-v3-playhead-wrapper');
    expect(playhead).toBeInTheDocument();
  });

  it('triggers onSeek on track pointer down', () => {
    const onSeek = vi.fn();
    const { container } = render(
      <TimelineRulerV3
        fps={30}
        ppf={10}
        duration={210}
        currentTime={0}
        onSeek={onSeek}
      />,
    );

    const track = container.querySelector('.tl-ruler-v3-track');
    expect(track).toBeInTheDocument();

    if (track) {
      // Mock getBoundingClientRect
      vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 26,
        width: 1000,
        height: 26,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      fireEvent.pointerDown(track, { clientX: 70 });
      expect(onSeek).toHaveBeenCalledWith(7);
    }
  });
});

describe('TimelineToolbarV3 Timecode Format', () => {
  it('renders standard 0:00 / 0:00 counter by default', () => {
    const { container } = render(
      <TimelineToolbarV3
        currentTime={0}
        duration={210}
        fps={30}
        zoom={1}
        zoomMin={0.5}
        zoomMax={2}
        onZoomChange={vi.fn()}
      />,
    );

    const currentSpan = container.querySelector('.tl-toolbar-v3-timecode-current');
    const durationSpan = container.querySelector('.tl-toolbar-v3-timecode-duration');

    expect(currentSpan?.textContent).toBe('0:00');
    expect(durationSpan?.textContent).toBe('0:07');
  });

  it('renders timecode when timeFormat="timecode"', () => {
    const { container } = render(
      <TimelineToolbarV3
        currentTime={0}
        duration={210}
        fps={30}
        timeFormat="timecode"
        zoom={1}
        zoomMin={0.5}
        zoomMax={2}
        onZoomChange={vi.fn()}
      />,
    );

    const currentSpan = container.querySelector('.tl-toolbar-v3-timecode-current');
    const durationSpan = container.querySelector('.tl-toolbar-v3-timecode-duration');

    expect(currentSpan?.textContent).toBe('00:00:00:00');
    expect(durationSpan?.textContent).toBe('00:00:07:00');
  });
});
