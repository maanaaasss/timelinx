---
"@timelinx/react": minor
---

Add 7 new reactive hooks for the editor panels:
- `useAllTracks(engine)` — returns all tracks reactively (single subscription)
- `useFps(engine)` — returns timeline FPS reactively
- `useClipEffects(engine, clipId)` — returns effects for a specific clip
- `useClipTransition(engine, clipId)` — returns transition for a specific clip
- `useTrackCaptions(engine, trackId)` — returns captions for a specific track
- `useAllTransitions(engine)` — returns all clips with transitions
- `useSelectedCaptionIds(engine)` — returns selected caption IDs reactively

Also add context-based re-exports: `useAllTracksContext`, `useFpsContext`, `useClipEffectsContext`, `useClipTransitionContext`, `useTrackCaptionsContext`, `useAllTransitionsContext`.

Fix `useClip` — was broken by conditional hook call. Now delegates to `useAllTracks` to comply with Rules of Hooks.

Memoize `useActiveTool` return value to prevent unnecessary re-renders.
