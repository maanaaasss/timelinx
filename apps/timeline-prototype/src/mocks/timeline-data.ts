import {
  createTimeline,
  createTrack,
  createClip,
  createTimelineState,
  toFrame,
  FrameRates,
  type TimelineState,
  type Track,
  type Clip,
} from '@timelinx/core';

function buildMockState(): TimelineState {
  const videoClips = [
    createClip({
      id: 'c1',
      assetId: 'a1',
      trackId: 't1',
      timelineStart: toFrame(0),
      timelineEnd: toFrame(120),
      mediaIn: toFrame(0),
      mediaOut: toFrame(120),
      name: 'Intro.mp4',
    }),
    createClip({
      id: 'c3',
      assetId: 'a3',
      trackId: 't1',
      timelineStart: toFrame(150),
      timelineEnd: toFrame(300),
      mediaIn: toFrame(0),
      mediaOut: toFrame(150),
      name: 'Main.mp4',
    }),
  ];

  const audio1Clips = [
    createClip({
      id: 'c2',
      assetId: 'a2',
      trackId: 't2',
      timelineStart: toFrame(60),
      timelineEnd: toFrame(180),
      mediaIn: toFrame(0),
      mediaOut: toFrame(120),
      name: 'Voiceover.wav',
    }),
  ];

  const audio2Clips = [
    createClip({
      id: 'c4',
      assetId: 'a4',
      trackId: 't3',
      timelineStart: toFrame(400),
      timelineEnd: toFrame(600),
      mediaIn: toFrame(0),
      mediaOut: toFrame(200),
      name: 'Outro.mp4',
    }),
  ];

  const tracks: Track[] = [
    createTrack({ id: 't1', name: 'Video 1', type: 'video', clips: videoClips }),
    createTrack({ id: 't2', name: 'Audio 1', type: 'audio', clips: audio1Clips }),
    createTrack({ id: 't3', name: 'Audio 2', type: 'audio', clips: audio2Clips }),
  ];

  const timeline = createTimeline({
    id: 'tl-proto',
    name: 'Prototype Timeline',
    fps: FrameRates.NTSC,
    duration: toFrame(1800),
    tracks,
  });

  return createTimelineState({ timeline });
}

export const mockState: TimelineState = buildMockState();

export type ClipType = 'video' | 'audio' | 'text';

export function getClipType(clip: Clip, tracks: readonly Track[]): ClipType {
  const track = tracks.find((t) => t.id === clip.trackId);
  if (!track) return 'video';
  if (track.type === 'audio') return 'audio';
  if (track.type === 'subtitle' || track.type === 'title') return 'text';
  return 'video';
}
