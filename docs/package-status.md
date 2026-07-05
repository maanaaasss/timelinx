# Package Status

## Published (npm)

| Package | Version | Coverage | Notes |
|---------|---------|----------|-------|
| `@timelinx/core` | `1.0.0-beta.1` | 97.4% | Headless timeline engine. Production-ready. |
| `@timelinx/react` | `1.0.0-beta.1` | ~90% | React adapter (hooks, context, tool routing). Production-ready. |

## Unpublished (monorepo only)

These packages exist in the monorepo but are **not published to npm** yet. They are marked `"private": true` in their `package.json`. They will be published in a future release once test coverage and API stability improve.

| Package | Coverage | Why not published |
|---------|----------|-------------------|
| `@timelinx/ui` | 0% (no tests) | React UI components. Needs render tests before first publish. |
| `@timelinx/media-web` | 23.7% | WebCodecs/WebAudio adapters. Workers and WebGL compositor untested. |
| `@timelinx/ai` | 43.4% | AI operations (NLU, transcripts, scene detection). Adapters largely untested. |
| `@timelinx/collab` | 48.6% | Collaboration layer (CRDT sync, conflict resolution). Sync and storage untested. |

All four packages build and typecheck successfully. They are fully functional within the monorepo (apps can import them via `workspace:*`). The `private` flag only prevents `npm publish` — it does not affect local development or monorepo usage.
