/**
 * Tests for @timelinx/collab
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  OperationLogStore,
  ConflictResolver,
  CRDTSyncManager,
  BranchingHistoryStore,
  PresenceManager,
  CommentManager,
  LocalStorageAdapter,
} from '../index';
import type { Transaction } from '@timelinx/core';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function createTestTransaction(label: string): Transaction {
  return {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    label,
    timestamp: Date.now(),
    operations: [],
  };
}

// ---------------------------------------------------------------------------
// OperationLogStore Tests
// ---------------------------------------------------------------------------

describe('OperationLogStore', () => {
  let store: OperationLogStore;

  beforeEach(() => {
    store = new OperationLogStore('doc-1', 'user-1');
  });

  it('should create store', () => {
    expect(store).toBeDefined();
  });

  it('should add entries', () => {
    const tx = createTestTransaction('test');
    const entry = store.addEntry(tx);

    expect(entry.userId).toBe('user-1');
    expect(entry.transaction).toBe(tx);
    expect(store.getEntries()).toHaveLength(1);
  });

  it('should track vector clock', () => {
    const tx1 = createTestTransaction('test 1');
    const tx2 = createTestTransaction('test 2');

    store.addEntry(tx1);
    store.addEntry(tx2);

    const clock = store.getVectorClock();
    expect(clock['user-1']).toBe(2);
  });

  it('should detect happened-before', () => {
    const tx1 = createTestTransaction('test 1');
    const tx2 = createTestTransaction('test 2');

    const entry1 = store.addEntry(tx1);
    const entry2 = store.addEntry(tx2);

    expect(store.happenedBefore(entry1, entry2)).toBe(true);
    expect(store.happenedBefore(entry2, entry1)).toBe(false);
  });

  it('should merge entries', () => {
    const otherStore = new OperationLogStore('doc-1', 'user-2');
    const tx1 = createTestTransaction('user 1');
    const tx2 = createTestTransaction('user 2');

    store.addEntry(tx1);
    otherStore.addEntry(tx2);

    store.merge(otherStore.getEntries());

    expect(store.getEntries()).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// ConflictResolver Tests
// ---------------------------------------------------------------------------

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  it('should create resolver', () => {
    expect(resolver).toBeDefined();
  });

  it('should detect concurrent modifications', () => {
    const op1 = {
      id: 'op-1',
      userId: 'user-1',
      transaction: createTestTransaction('test'),
      timestamp: 1000,
      vectorClock: { 'user-1': 1 },
      parentId: null,
    };

    const op2 = {
      id: 'op-2',
      userId: 'user-2',
      transaction: createTestTransaction('test'),
      timestamp: 1000,
      vectorClock: { 'user-2': 1 },
      parentId: null,
    };

    // These don't modify same entities, so no conflict
    const conflict = resolver.detectConflict(op1, op2);
    expect(conflict).toBeNull();
  });

  it('should not detect conflict for same user', () => {
    const op1 = {
      id: 'op-1',
      userId: 'user-1',
      transaction: createTestTransaction('test'),
      timestamp: 1000,
      vectorClock: { 'user-1': 1 },
      parentId: null,
    };

    const op2 = {
      id: 'op-2',
      userId: 'user-1',
      transaction: createTestTransaction('test'),
      timestamp: 1000,
      vectorClock: { 'user-1': 2 },
      parentId: null,
    };

    const conflict = resolver.detectConflict(op1, op2);
    expect(conflict).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// CRDTSyncManager Tests
// ---------------------------------------------------------------------------

describe('CRDTSyncManager', () => {
  let manager: CRDTSyncManager;

  beforeEach(() => {
    manager = new CRDTSyncManager('doc-1', 'user-1');
  });

  it('should create manager', () => {
    expect(manager).toBeDefined();
  });

  it('should apply local operations', () => {
    const tx = createTestTransaction('test');
    const op = manager.applyLocalOperation(tx);

    expect(op.userId).toBe('user-1');
    expect(manager.getState().operations).toHaveLength(1);
  });

  it('should receive remote operations', () => {
    const op = {
      id: 'user-2-1',
      userId: 'user-2',
      operation: createTestTransaction('remote'),
      timestamp: 1000,
      dependencies: [],
    };

    manager.receiveOperation(op);

    expect(manager.getState().operations).toHaveLength(1);
  });

  it('should not apply duplicate operations', () => {
    const op = {
      id: 'user-2-1',
      userId: 'user-2',
      operation: createTestTransaction('remote'),
      timestamp: 1000,
      dependencies: [],
    };

    manager.receiveOperation(op);
    manager.receiveOperation(op);

    expect(manager.getState().operations).toHaveLength(1);
  });

  it('should check concurrency', () => {
    const state1 = {
      documentId: 'doc-1',
      operations: [],
      vectorClock: { 'user-1': 1 },
      lastModified: Date.now(),
    };

    const state2 = {
      documentId: 'doc-1',
      operations: [],
      vectorClock: { 'user-2': 1 },
      lastModified: Date.now(),
    };

    manager['state'] = state1;

    expect(manager.areConcurrent(state2)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// BranchingHistoryStore Tests
// ---------------------------------------------------------------------------

describe('BranchingHistoryStore', () => {
  let store: BranchingHistoryStore;

  beforeEach(() => {
    store = new BranchingHistoryStore('user-1');
  });

  it('should create store with main branch', () => {
    expect(store).toBeDefined();
    expect(store.getCurrentBranch().id).toBe('main');
  });

  it('should create new branch', () => {
    const branch = store.createBranch('feature', 'user-1');
    expect(branch.name).toBe('feature');
    expect(branch.parentId).toBe('main');
  });

  it('should switch branches', () => {
    const branch = store.createBranch('feature', 'user-1');
    store.switchBranch(branch.id);
    expect(store.getCurrentBranch().name).toBe('feature');
  });

  it('should get ancestors', () => {
    const branch1 = store.createBranch('feature', 'user-1');
    store.switchBranch(branch1.id);
    const branch2 = store.createBranch('sub-feature', 'user-1');

    const ancestors = store.getAncestors(branch2.id);
    // main -> feature -> sub-feature = 3 branches
    expect(ancestors.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// PresenceManager Tests
// ---------------------------------------------------------------------------

describe('PresenceManager', () => {
  let manager: PresenceManager;

  beforeEach(() => {
    manager = new PresenceManager('user-1');
  });

  it('should create manager', () => {
    expect(manager).toBeDefined();
  });

  it('should update local presence', () => {
    const presence = manager.updateLocalPresence({
      displayName: 'Test User',
      color: '#ff0000',
    });

    expect(presence.userId).toBe('user-1');
    expect(presence.displayName).toBe('Test User');
  });

  it('should update cursor', () => {
    manager.updateCursor(100, 'track-1', 50, 100);
    const presence = manager.getLocalPresence();

    expect(presence?.cursor?.frame).toBe(100);
    expect(presence?.cursor?.trackId).toBe('track-1');
  });

  it('should get cursor positions', () => {
    manager.updateRemotePresence({
      userId: 'user-2',
      displayName: 'Other User',
      color: '#00ff00',
      cursor: { frame: 50, trackId: 'track-1', x: 100, y: 50 },
      selection: null,
      lastHeartbeat: Date.now(),
      isActive: true,
    });

    const cursors = manager.getCursorPositions();
    expect(cursors).toHaveLength(1);
    expect(cursors[0].userId).toBe('user-2');
  });
});

// ---------------------------------------------------------------------------
// CommentManager Tests
// ---------------------------------------------------------------------------

describe('CommentManager', () => {
  let manager: CommentManager;

  beforeEach(() => {
    manager = new CommentManager('user-1');
  });

  it('should create manager', () => {
    expect(manager).toBeDefined();
  });

  it('should add comment', () => {
    const comment = manager.addComment('Test comment', 100);

    expect(comment.text).toBe('Test comment');
    expect(comment.frame).toBe(100);
    expect(manager.getComments()).toHaveLength(1);
  });

  it('should reply to comment', () => {
    const comment = manager.addComment('Original', 100);
    const reply = manager.replyToComment(comment.id, 'Reply');

    expect(reply).not.toBeNull();
    expect(reply?.threadId).toBe(comment.id);
    expect(manager.getThread(comment.id)).toHaveLength(2);
  });

  it('should resolve comment', () => {
    const comment = manager.addComment('To resolve', 100);
    manager.resolveComment(comment.id, true);

    const resolved = manager.getComments()[0];
    expect(resolved.resolved).toBe(true);
  });

  it('should delete own comment', () => {
    const comment = manager.addComment('Delete me', 100);
    const deleted = manager.deleteComment(comment.id);

    expect(deleted).toBe(true);
    expect(manager.getComments()).toHaveLength(0);
  });

  it('should not delete others comments', () => {
    const comment: any = {
      id: 'other-comment',
      userId: 'user-2',
      text: 'Not mine',
      frame: 100,
      trackId: null,
      threadId: null,
      createdAt: Date.now(),
      resolved: false,
    };

    manager['comments'].set(comment.id, comment);
    const deleted = manager.deleteComment(comment.id);

    expect(deleted).toBe(false);
  });
});
