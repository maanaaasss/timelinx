/**
 * PresenceManager
 *
 * Manages user presence, cursors, and selections for collaborative editing.
 */

import type { TimelineFrame } from '@timelinx/core';
import type {
  UserPresence,
  CursorPosition,
  UserSelection,
} from '../types';

// ---------------------------------------------------------------------------
// PresenceManager
// ---------------------------------------------------------------------------

export class PresenceManager {
  private presences: Map<string, UserPresence> = new Map();
  private localUserId: string;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private inactiveThreshold: number;
  private onPresenceUpdate: ((presence: UserPresence) => void) | null = null;
  private onUserJoin: ((userId: string) => void) | null = null;
  private onUserLeave: ((userId: string) => void) | null = null;

  constructor(localUserId: string, inactiveThreshold: number = 30000) {
    this.localUserId = localUserId;
    this.inactiveThreshold = inactiveThreshold;
  }

  /**
   * Set callbacks.
   */
  onPresenceChange(callback: (presence: UserPresence) => void): void {
    this.onPresenceUpdate = callback;
  }

  onJoin(callback: (userId: string) => void): void {
    this.onUserJoin = callback;
  }

  onLeave(callback: (userId: string) => void): void {
    this.onUserLeave = callback;
  }

  /**
   * Start heartbeat to detect active users.
   */
  startHeartbeat(intervalMs: number = 5000): void {
    this.heartbeatInterval = setInterval(() => {
      this.updateLocalPresence({});
      this.checkInactiveUsers();
    }, intervalMs);
  }

  /**
   * Stop heartbeat.
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Update local user's presence.
   */
  updateLocalPresence(updates: Partial<UserPresence>): UserPresence {
    const existing = this.presences.get(this.localUserId);
    const presence: UserPresence = {
      userId: this.localUserId,
      displayName: updates.displayName || existing?.displayName || 'Anonymous',
      color: updates.color || existing?.color || this.generateColor(),
      cursor: updates.cursor !== undefined ? updates.cursor : existing?.cursor || null,
      selection: updates.selection !== undefined ? updates.selection : existing?.selection || null,
      lastHeartbeat: Date.now(),
      isActive: true,
    };

    this.presences.set(this.localUserId, presence);
    this.onPresenceUpdate?.(presence);
    return presence;
  }

  /**
   * Update remote user's presence.
   */
  updateRemotePresence(presence: UserPresence): void {
    const existing = this.presences.get(presence.userId);
    const updated: UserPresence = {
      ...presence,
      lastHeartbeat: Date.now(),
      isActive: true,
    };
    this.presences.set(presence.userId, updated);

    // Notify if new user
    if (!existing) {
      this.onUserJoin?.(presence.userId);
    }

    this.onPresenceUpdate?.(updated);
  }

  /**
   * Get all active presences.
   */
  getActivePresences(): UserPresence[] {
    return Array.from(this.presences.values()).filter((p) => p.isActive);
  }

  /**
   * Get a specific user's presence.
   */
  getPresence(userId: string): UserPresence | undefined {
    return this.presences.get(userId);
  }

  /**
   * Get local user's presence.
   */
  getLocalPresence(): UserPresence | undefined {
    return this.presences.get(this.localUserId);
  }

  /**
   * Update local cursor position.
   */
  updateCursor(frame: TimelineFrame, trackId: string | null, x: number, y: number): void {
    const cursor: CursorPosition = { frame, trackId, x, y };
    this.updateLocalPresence({ cursor });
  }

  /**
   * Update local selection.
   */
  updateSelection(selection: UserSelection | null): void {
    this.updateLocalPresence({ selection });
  }

  /**
   * Remove a user's presence.
   */
  removePresence(userId: string): void {
    this.presences.delete(userId);
    this.onUserLeave?.(userId);
  }

  /**
   * Check for inactive users.
   */
  private checkInactiveUsers(): void {
    const now = Date.now();

    for (const [userId, presence] of this.presences) {
      if (userId === this.localUserId) continue;
      if (now - presence.lastHeartbeat > this.inactiveThreshold) {
        const updatedPresence: UserPresence = { ...presence, isActive: false };
        this.presences.set(userId, updatedPresence);
        this.onPresenceUpdate?.(updatedPresence);
      }
    }
  }

  /**
   * Generate a random color for a user.
   */
  private generateColor(): string {
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e',
      '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Get all cursor positions (for rendering).
   */
  getCursorPositions(): Array<{ userId: string; color: string; cursor: CursorPosition }> {
    return this.getActivePresences()
      .filter((p) => p.cursor && p.userId !== this.localUserId)
      .map((p) => ({
        userId: p.userId,
        color: p.color,
        cursor: p.cursor!,
      }));
  }

  /**
   * Get all selections (for rendering).
   */
  getSelections(): Array<{ userId: string; color: string; selection: UserSelection }> {
    return this.getActivePresences()
      .filter((p) => p.selection && p.userId !== this.localUserId)
      .map((p) => ({
        userId: p.userId,
        color: p.color,
        selection: p.selection!,
      }));
  }

  /**
   * Clear all presences.
   */
  clear(): void {
    this.presences.clear();
    this.stopHeartbeat();
  }

  /**
   * Destroy the manager and release all resources.
   */
  destroy(): void {
    this.stopHeartbeat();
    this.presences.clear();
    this.onPresenceUpdate = null;
    this.onUserJoin = null;
    this.onUserLeave = null;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createPresenceManager(localUserId: string): PresenceManager {
  return new PresenceManager(localUserId);
}
