/**
 * CommentManager
 *
 * Manages comments and threads on the timeline.
 */

import type { TimelineFrame } from '@timelinx/core';
import type { Comment } from '../types';

// ---------------------------------------------------------------------------
// CommentManager
// ---------------------------------------------------------------------------

export class CommentManager {
  private comments: Map<string, Comment> = new Map();
  private localUserId: string;
  private commentIdCounter = 0;
  private onCommentAdd: ((comment: Comment) => void) | null = null;
  private onCommentUpdate: ((comment: Comment) => void) | null = null;
  private onCommentDelete: ((commentId: string) => void) | null = null;

  constructor(localUserId: string) {
    this.localUserId = localUserId;
  }

  /**
   * Set callbacks.
   */
  onAdd(callback: (comment: Comment) => void): void {
    this.onCommentAdd = callback;
  }

  onUpdate(callback: (comment: Comment) => void): void {
    this.onCommentUpdate = callback;
  }

  onDelete(callback: (commentId: string) => void): void {
    this.onCommentDelete = callback;
  }

  /**
   * Add a new comment.
   */
  addComment(
    text: string,
    frame: TimelineFrame,
    trackId: string | null = null,
    threadId: string | null = null,
  ): Comment {
    const comment: Comment = {
      id: `comment-${Date.now()}-${++this.commentIdCounter}-${Math.random().toString(36).slice(2, 9)}`,
      userId: this.localUserId,
      text,
      frame,
      trackId,
      threadId,
      createdAt: Date.now(),
      resolved: false,
    };

    this.comments.set(comment.id, comment);
    this.onCommentAdd?.(comment);
    return comment;
  }

  /**
   * Update a comment's text.
   */
  updateComment(commentId: string, text: string): Comment | null {
    const comment = this.comments.get(commentId);
    if (!comment) return null;

    const updated: Comment = { ...comment, text };
    this.comments.set(commentId, updated);
    this.onCommentUpdate?.(updated);
    return updated;
  }

  /**
   * Resolve/unresolve a comment.
   */
  resolveComment(commentId: string, resolved: boolean): Comment | null {
    const comment = this.comments.get(commentId);
    if (!comment) return null;

    const updated: Comment = { ...comment, resolved };
    this.comments.set(commentId, updated);
    this.onCommentUpdate?.(updated);
    return updated;
  }

  /**
   * Delete a comment.
   */
  deleteComment(commentId: string): boolean {
    const comment = this.comments.get(commentId);
    if (!comment) return false;

    // Only allow deleting own comments
    if (comment.userId !== this.localUserId) {
      return false;
    }

    // If this is a root comment (no threadId), also delete all replies
    if (!comment.threadId) {
      const replyIds: string[] = [];
      for (const [id, c] of this.comments) {
        if (c.threadId === commentId) {
          replyIds.push(id);
        }
      }
      for (const id of replyIds) {
        this.comments.delete(id);
        this.onCommentDelete?.(id);
      }
    }

    this.comments.delete(commentId);
    this.onCommentDelete?.(commentId);
    return true;
  }

  /**
   * Get all comments.
   */
  getComments(): Comment[] {
    return Array.from(this.comments.values());
  }

  /**
   * Get comments at a specific frame.
   */
  getCommentsAtFrame(frame: TimelineFrame): Comment[] {
    return this.getComments().filter((c) => c.frame === frame);
  }

  /**
   * Get comments on a specific track.
   */
  getCommentsOnTrack(trackId: string): Comment[] {
    return this.getComments().filter((c) => c.trackId === trackId);
  }

  /**
   * Get thread (comment and its replies).
   */
  getThread(commentId: string): Comment[] {
    const comment = this.comments.get(commentId);
    if (!comment) return [];

    // Get the root comment
    const rootId = comment.threadId || commentId;

    return this.getComments().filter(
      (c) => c.id === rootId || c.threadId === rootId,
    );
  }

  /**
   * Get unresolved comments.
   */
  getUnresolvedComments(): Comment[] {
    return this.getComments().filter((c) => !c.resolved);
  }

  /**
   * Get comments by user.
   */
  getCommentsByUser(userId: string): Comment[] {
    return this.getComments().filter((c) => c.userId === userId);
  }

  /**
   * Add a reply to a comment.
   */
  replyToComment(commentId: string, text: string): Comment | null {
    const comment = this.comments.get(commentId);
    if (!comment) return null;

    const threadId = comment.threadId || commentId;
    return this.addComment(text, comment.frame, comment.trackId, threadId);
  }

  /**
   * Import comments.
   */
  importComments(comments: Comment[]): void {
    for (const comment of comments) {
      this.comments.set(comment.id, comment);
      this.onCommentAdd?.(comment);
    }
  }

  /**
   * Export comments.
   */
  exportComments(): Comment[] {
    return this.getComments();
  }

  /**
   * Clear all comments.
   */
  clear(): void {
    this.comments.clear();
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCommentManager(localUserId: string): CommentManager {
  return new CommentManager(localUserId);
}
