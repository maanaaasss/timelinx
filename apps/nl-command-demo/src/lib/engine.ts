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
    name: 'NL Command Demo',
    fps: 30,
    duration: 3000, // 100 seconds
  });

  // Add video tracks
  const videoTrack1 = createTrack({
    id: 'track-video-1',
    type: 'video',
    name: 'Video 1',
    height: 80,
  });

  const videoTrack2 = createTrack({
    id: 'track-video-2',
    type: 'video',
    name: 'Video 2',
    height: 80,
  });

  // Add audio tracks
  const audioTrack1 = createTrack({
    id: 'track-audio-1',
    type: 'audio',
    name: 'Audio 1',
    height: 60,
  });

  // Add subtitle track
  const subtitleTrack = createTrack({
    id: 'track-subtitle',
    type: 'subtitle',
    name: 'Captions',
    height: 40,
  });

  // Add sample clips
  const clip1 = createClip({
    id: 'clip-1',
    name: 'Intro',
    timelineStart: 0,
    timelineEnd: 150,
    mediaStart: 0,
    mediaEnd: 150,
    enabled: true,
  });

  const clip2 = createClip({
    id: 'clip-2',
    name: 'Main Content',
    timelineStart: 150,
    timelineEnd: 600,
    mediaStart: 0,
    mediaEnd: 450,
    enabled: true,
  });

  const clip3 = createClip({
    id: 'clip-3',
    name: 'B-Roll',
    timelineStart: 600,
    timelineEnd: 900,
    mediaStart: 0,
    mediaEnd: 300,
    enabled: true,
  });

  const audioClip1 = createClip({
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
        { ...videoTrack1, clips: [clip1, clip2] },
        { ...videoTrack2, clips: [clip3] },
        { ...audioTrack1, clips: [audioClip1] },
        subtitleTrack,
      ],
    },
  };
}
