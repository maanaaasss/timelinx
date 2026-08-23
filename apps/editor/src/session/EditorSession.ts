/**
 * EditorSession — the single lifecycle owner for the editor's timeline engine.
 *
 * P1 goal (see docs/production-release-plan.md §6): there must be exactly one
 * place that creates or replaces a `TimelineEngine`, tracks unsaved ("dirty")
 * state, and disposes browser resources (media element pools, object URLs) when
 * a project is replaced or the app unmounts.
 *
 * This module is intentionally DOM-free and React-free so it can be unit tested
 * without a browser. Anything that touches `File`/`Blob`/object URLs is injected
 * through the `revokeAsset` callback, keeping the architectural boundary from
 * the plan intact: "The editor owns browser resources" lives at the React edge,
 * the lifecycle rules live here.
 */

/** Minimal surface of `TimelineEngine` that the session depends on. */
export interface SessionEngine {
  /** Immutable state reference; a new reference means the project changed. */
  getState(): unknown;
  /** Subscribe to engine changes; returns an unsubscribe function. */
  subscribe(callback: () => void): () => void;
  /** Release all engine-held resources (playback, subscriptions, pools). */
  destroy(): void;
}

export type EngineFactory<E extends SessionEngine = SessionEngine> = () => E;

/** Called when an imported asset's browser resources must be released. */
export type RevokeAsset = (assetId: string) => void;

export interface EditorSessionOptions<E extends SessionEngine> {
  /** Produces the initial engine (usually a blank project). */
  createEngine: EngineFactory<E>;
  /**
   * Releases a single imported asset's blob URL / media element.
   * Wired by the React layer to `MediaAssetsContextValue.removeImportedAsset`.
   * Optional so the session can be tested without a media sidecar.
   */
  revokeAsset?: RevokeAsset;
}

type Listener = () => void;

/**
 * Owns one engine at a time. Replacing the engine (new/open project) tears the
 * previous one down atomically: unsubscribe, revoke tracked assets, destroy the
 * old engine, then swap in the new one and re-establish the dirty baseline.
 */
export class EditorSession<E extends SessionEngine = SessionEngine> {
  private readonly createEngine: EngineFactory<E>;
  private readonly revokeAsset?: RevokeAsset;

  private engine: E;
  private engineUnsubscribe: (() => void) | null = null;

  /** State reference captured at the last save (or project load). */
  private savedStateRef: unknown;
  private dirty = false;
  private disposed = false;

  /** Increments each time the engine is replaced; used as a React remount key. */
  private generationCount = 0;

  /** Imported assets whose browser resources this project owns. */
  private readonly importedAssetIds = new Set<string>();

  private readonly listeners = new Set<Listener>();

  constructor(options: EditorSessionOptions<E>) {
    this.createEngine = options.createEngine;
    this.revokeAsset = options.revokeAsset;
    this.engine = this.createEngine();
    this.savedStateRef = this.engine.getState();
    this.attach(this.engine);
  }

  /** The current engine. Never null until {@link dispose} is called. */
  getEngine(): E {
    this.assertLive();
    return this.engine;
  }

  /** True when there are edits since the last {@link markSaved}. */
  isDirty(): boolean {
    return this.dirty;
  }

  /** Monotonic counter that changes whenever the engine is replaced. */
  getGeneration(): number {
    return this.generationCount;
  }

  /**
   * Replace the current project with a freshly created engine (e.g. "New" or
   * "Open"). The previous engine and all its imported-asset resources are
   * released before the new engine is attached. A rejected/failed factory
   * leaves the existing session untouched.
   */
  replaceEngine(factory?: EngineFactory<E>): E {
    this.assertLive();
    const make = factory ?? this.createEngine;

    // Build the replacement first so a throwing factory cannot leave us
    // without a live engine (atomic swap).
    const next = make();

    this.teardownCurrent();

    this.engine = next;
    this.savedStateRef = next.getState();
    this.dirty = false;
    this.generationCount += 1;
    this.attach(next);
    this.emit();
    return next;
  }

  /**
   * Record that an imported asset belongs to the current project so its browser
   * resources are revoked on project replacement / dispose.
   */
  registerImportedAsset(assetId: string): void {
    this.assertLive();
    this.importedAssetIds.add(assetId);
  }

  /** Forget and immediately revoke a single imported asset (e.g. user removed it). */
  releaseImportedAsset(assetId: string): void {
    if (this.importedAssetIds.delete(assetId)) {
      this.revokeAsset?.(assetId);
    }
  }

  /** Snapshot of imported asset IDs owned by the current project. */
  getImportedAssetIds(): ReadonlySet<string> {
    return new Set(this.importedAssetIds);
  }

  /** Mark the current state as the clean baseline (call after a successful save). */
  markSaved(): void {
    this.assertLive();
    this.savedStateRef = this.engine.getState();
    if (this.dirty) {
      this.dirty = false;
      this.emit();
    }
  }

  /** Subscribe to dirty-state / engine-replacement changes. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Tear everything down. Safe to call more than once. */
  dispose(): void {
    if (this.disposed) return;
    this.teardownCurrent();
    this.listeners.clear();
    this.disposed = true;
  }

  // --- internal ------------------------------------------------------------

  private attach(engine: E): void {
    this.engineUnsubscribe = engine.subscribe(() => {
      const changed = engine.getState() !== this.savedStateRef;
      if (changed !== this.dirty) {
        this.dirty = changed;
        this.emit();
      }
    });
  }

  private teardownCurrent(): void {
    this.engineUnsubscribe?.();
    this.engineUnsubscribe = null;

    for (const assetId of this.importedAssetIds) {
      this.revokeAsset?.(assetId);
    }
    this.importedAssetIds.clear();

    this.engine.destroy();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  private assertLive(): void {
    if (this.disposed) {
      throw new Error('EditorSession has been disposed and can no longer be used.');
    }
  }
}
