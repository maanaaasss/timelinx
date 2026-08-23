import { describe, it, expect, vi } from 'vitest';
import { EditorSession, type SessionEngine } from '../session/EditorSession';

/** Controllable fake engine that mimics the immutable-state + subscribe contract. */
class FakeEngine implements SessionEngine {
  state = { v: 0 };
  destroyed = false;
  private subs = new Set<() => void>();

  getState(): unknown {
    return this.state;
  }

  subscribe(cb: () => void): () => void {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }

  destroy(): void {
    this.destroyed = true;
    this.subs.clear();
  }

  /** Simulate an edit: new immutable state reference + notify. */
  edit(): void {
    this.state = { v: this.state.v + 1 };
    for (const cb of this.subs) cb();
  }
}

function makeSession(revoke = vi.fn()) {
  const engines: FakeEngine[] = [];
  const createEngine = () => {
    const e = new FakeEngine();
    engines.push(e);
    return e;
  };
  const session = new EditorSession<FakeEngine>({ createEngine, revokeAsset: revoke });
  return { session, engines, revoke };
}

describe('EditorSession', () => {
  it('starts clean and becomes dirty on edit', () => {
    const { session, engines } = makeSession();
    const listener = vi.fn();
    session.subscribe(listener);

    expect(session.isDirty()).toBe(false);
    engines[0].edit();

    expect(session.isDirty()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('markSaved clears the dirty flag against the current state', () => {
    const { session, engines } = makeSession();
    engines[0].edit();
    expect(session.isDirty()).toBe(true);

    session.markSaved();
    expect(session.isDirty()).toBe(false);

    // Editing again re-dirties.
    engines[0].edit();
    expect(session.isDirty()).toBe(true);
  });

  it('replaceEngine destroys the old engine, resets dirty, and bumps generation', () => {
    const { session, engines } = makeSession();
    engines[0].edit();
    expect(session.isDirty()).toBe(true);
    const gen = session.getGeneration();

    session.replaceEngine();

    expect(engines[0].destroyed).toBe(true);
    expect(session.getEngine()).toBe(engines[1]);
    expect(session.isDirty()).toBe(false);
    expect(session.getGeneration()).toBe(gen + 1);
  });

  it('revokes all tracked imported assets when the project is replaced', () => {
    const { session, revoke } = makeSession();
    session.registerImportedAsset('a1');
    session.registerImportedAsset('a2');

    session.replaceEngine();

    expect(revoke).toHaveBeenCalledWith('a1');
    expect(revoke).toHaveBeenCalledWith('a2');
    expect(revoke).toHaveBeenCalledTimes(2);
    // Ownership resets with the new project.
    expect(session.getImportedAssetIds().size).toBe(0);
  });

  it('releaseImportedAsset revokes once and forgets the asset', () => {
    const { session, revoke } = makeSession();
    session.registerImportedAsset('a1');

    session.releaseImportedAsset('a1');
    expect(revoke).toHaveBeenCalledWith('a1');

    // Second release is a no-op (already forgotten).
    session.releaseImportedAsset('a1');
    expect(revoke).toHaveBeenCalledTimes(1);
  });

  it('a throwing factory leaves the existing engine intact', () => {
    const { session, engines } = makeSession();
    const original = session.getEngine();

    expect(() =>
      session.replaceEngine(() => {
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(session.getEngine()).toBe(original);
    expect(engines[0].destroyed).toBe(false);
    expect(session.getGeneration()).toBe(0);
  });

  it('dispose revokes remaining assets, destroys the engine, and blocks reuse', () => {
    const { session, engines, revoke } = makeSession();
    session.registerImportedAsset('a1');

    session.dispose();

    expect(revoke).toHaveBeenCalledWith('a1');
    expect(engines[0].destroyed).toBe(true);
    expect(() => session.getEngine()).toThrow(/disposed/);

    // Idempotent.
    expect(() => session.dispose()).not.toThrow();
  });

  it('stops notifying after the engine is replaced (old subscription released)', () => {
    const { session, engines } = makeSession();
    const listener = vi.fn();
    session.subscribe(listener);

    session.replaceEngine();
    listener.mockClear();

    // Editing the *old* engine must not affect the session anymore.
    engines[0].edit();
    expect(listener).not.toHaveBeenCalled();

    // Editing the new engine does.
    engines[1].edit();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
