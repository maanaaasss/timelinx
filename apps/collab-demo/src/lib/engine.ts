import { TimelineEngine, createTimelineState, createTrack, createClip } from '@timelinx/core';

let engineInstance: TimelineEngine | null = null;

export function getEngine(): TimelineEngine {
  if (!engineInstance) {
    engineInstance = new TimelineEngine();
    const state = createInitialState();
    engineInstance.loadState(state);
  }
  return engineInstance;
}

export function resetEngine(): void {
  engineInstance = null;
}

function createInitialState() {
  const state = createTimelineState({
    name: 'Collab Demo',
    fps: 30,
    duration: 3000,
  });

  const videoTrack = createTrack({
    id: 'track-video',
    type: 'video',
    name: 'Video 1',
    height: 80,
  });

  const audioTrack = createTrack({
    id: 'track-audio',
    type: 'audio',
    name: 'Audio 1',
    height: 60,
  });

  const clip1 = createClip({
    id: 'clip-1',
    name: 'Clip A',
    timelineStart: 0,
    timelineEnd: 300,
    mediaStart: 0,
    mediaEnd: 300,
    enabled: true,
  });

  const clip2 = createClip({
    id: 'clip-2',
    name: 'Clip B',
    timelineStart: 300,
    timelineEnd: 600,
    mediaStart: 0,
    mediaEnd: 300,
    enabled: true,
  });

  const clip3 = createClip({
    id: 'clip-3',
    name: 'Clip C',
    timelineStart: 600,
    timelineEnd: 900,
    mediaStart: 0,
    mediaEnd: 300,
    enabled: true,
  });

  const audioClip = createClip({
    id: 'audio-clip-1',
    name: 'Voiceover',
    timelineStart: 0,
    timelineEnd: 900,
    mediaStart: 0,
    mediaEnd: 900,
    enabled: true,
  });

  return {
    ...state,
    timeline: {
      ...state.timeline,
      tracks: [
        { ...videoTrack, clips: [clip1, clip2, clip3] },
        { ...audioTrack, clips: [audioClip] },
      ],
    },
  };
}
