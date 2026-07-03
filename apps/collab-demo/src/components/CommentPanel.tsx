import React, { useState, useEffect, useCallback } from 'react';
import type { CommentManager, Comment } from '@timelinx/collab';
import type { TimelineEngine } from '@timelinx/react';
import { usePlayheadFrame } from '@timelinx/react';
import { MessageSquare, Send, Check, X } from 'lucide-react';

type CommentPanelProps = {
  commentManager: CommentManager;
  currentUserId: string;
  engine: TimelineEngine;
};

export function CommentPanel({ commentManager, currentUserId, engine }: CommentPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const frame = usePlayheadFrame(engine);

  useEffect(() => {
    setComments(commentManager.getComments());

    const onAddHandler = () => {
      setComments(commentManager.getComments());
    };

    const onUpdateHandler = () => {
      setComments(commentManager.getComments());
    };

    const onDeleteHandler = () => {
      setComments(commentManager.getComments());
    };

    commentManager.onAdd(onAddHandler);
    commentManager.onUpdate(onUpdateHandler);
    commentManager.onDelete(onDeleteHandler);

    return () => {
      commentManager.onAdd(() => {});
      commentManager.onUpdate(() => {});
      commentManager.onDelete(() => {});
    };
  }, [commentManager]);

  const handleAddComment = useCallback(() => {
    if (newComment.trim()) {
      commentManager.addComment(newComment.trim(), frame as number);
      setNewComment('');
    }
  }, [newComment, frame, commentManager]);

  const handleResolve = useCallback((commentId: string, resolved: boolean) => {
    commentManager.resolveComment(commentId, resolved);
  }, [commentManager]);

  const handleDelete = useCallback((commentId: string) => {
    commentManager.deleteComment(commentId);
  }, [commentManager]);

  const handleReply = useCallback((commentId: string, text: string) => {
    commentManager.replyToComment(commentId, text);
  }, [commentManager]);

  return (
    <div className="comment-panel">
      <div className="panel-header">
        <MessageSquare size={16} />
        <h3>Comments ({comments.length})</h3>
      </div>

      <div className="comment-input">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add comment at current frame..."
          onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
        />
        <button onClick={handleAddComment} disabled={!newComment.trim()}>
          <Send size={14} />
        </button>
      </div>

      <div className="comment-list">
        {comments
          .filter((c) => !c.threadId)
          .map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              replies={comments.filter((c) => c.threadId === comment.id)}
              currentUserId={currentUserId}
              onResolve={handleResolve}
              onDelete={handleDelete}
              onReply={handleReply}
            />
          ))}
      </div>

      {comments.length === 0 && (
        <div className="empty-state">
          <p>No comments yet</p>
        </div>
      )}
    </div>
  );
}

type CommentCardProps = {
  comment: Comment;
  replies: Comment[];
  currentUserId: string;
  onResolve: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
  onReply: (id: string, text: string) => void;
};

function CommentCard({ comment, replies, currentUserId, onResolve, onDelete, onReply }: CommentCardProps) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleReply = () => {
    if (replyText.trim()) {
      onReply(comment.id, replyText.trim());
      setReplyText('');
      setShowReply(false);
    }
  };

  return (
    <div className={`comment-card ${comment.resolved ? 'resolved' : ''}`}>
      <div className="comment-header">
        <span className="comment-user">{comment.userId.slice(0, 8)}</span>
        <span className="comment-frame">Frame {comment.frame}</span>
      </div>
      <p className="comment-text">{comment.text}</p>
      <div className="comment-actions">
        {comment.userId === currentUserId && (
          <>
            <button onClick={() => onResolve(comment.id, !comment.resolved)}>
              <Check size={12} />
              {comment.resolved ? 'Unresolve' : 'Resolve'}
            </button>
            <button onClick={() => onDelete(comment.id)}>
              <X size={12} />
              Delete
            </button>
          </>
        )}
        <button onClick={() => setShowReply(!showReply)}>
          Reply
        </button>
      </div>

      {showReply && (
        <div className="reply-input">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write reply..."
            onKeyPress={(e) => e.key === 'Enter' && handleReply()}
          />
          <button onClick={handleReply}>Send</button>
        </div>
      )}

      {replies.length > 0 && (
        <div className="replies">
          {replies.map((reply) => (
            <div key={reply.id} className="reply-card">
              <span className="reply-user">{reply.userId.slice(0, 8)}</span>
              <p className="reply-text">{reply.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
