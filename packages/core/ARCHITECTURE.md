# @timelinx/core — Architecture & High-Level Design

> This package implements the headless, deterministic Non-Linear Editing (NLE) timeline kernel for Timelinx.

For the complete, authoritative High-Level Design (HLD) document, please refer to:
**[docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)**

---

## Architectural Summary

1. **Zero Runtime Dependencies**: Pure TypeScript/JavaScript with zero DOM or external library imports.
2. **Single Mutation Gateway**: All state updates flow through `dispatch(state, transaction)`. Direct mutations are forbidden.
3. **Immutability & Structural Sharing**: Returned states use structural sharing and are recursively frozen with `Object.freeze()`.
4. **Rolling Validation & All-or-Nothing Rollback**: Operations in a transaction are validated against rolling state; if any operation or invariant check fails, zero operations commit.
5. **Branded Nominals**: Compile-time branded IDs (`ClipId`, `TrackId`, `AssetId`, `TimelineFrame`) prevent domain type errors.
6. **Subpath Exports**:
   - `@timelinx/core` (`public-api.ts`) — Engine, Dispatcher, Invariants, Tools, History.
   - `@timelinx/core/serialization` (`serialization.ts`) — JSON, OTIO, EDL, AAF, FCPXML.
   - `@timelinx/core/media` (`media.ts`) — Subtitle parsers, Marker search, Thumbnail queue, Worker contracts.
   - `@timelinx/core/internal` (`internal.ts`) — Engine internals.

See [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) for full diagrams, operation taxonomies, invariant rules, and subsystem specifications.
