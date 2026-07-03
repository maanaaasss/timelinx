import React, { useState, useRef, useCallback } from 'react';

export interface TranscriptWord {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  speaker?: string;
  confidence?: number;
}

interface TranscriptEditorProps {
  words: TranscriptWord[];
  currentTimeMs: number;
  onWordClick: (word: TranscriptWord) => void;
  onWordEdit: (wordId: string, newText: string) => void;
  onWordDelete: (wordId: string) => void;
  onTimeUpdate: (wordId: string, newStartMs: number, newEndMs: number) => void;
}

export function TranscriptEditor({
  words,
  currentTimeMs,
  onWordClick,
  onWordEdit,
  onWordDelete,
  onTimeUpdate,
}: TranscriptEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const findCurrentWordIndex = useCallback(() => {
    return words.findIndex(
      (w) => currentTimeMs >= w.startMs && currentTimeMs <= w.endMs,
    );
  }, [words, currentTimeMs]);

  const handleDoubleClick = (word: TranscriptWord) => {
    setEditingId(word.id);
    setEditValue(word.text);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitEdit = () => {
    if (editingId && editValue.trim()) {
      onWordEdit(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (e.shiftKey) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitEdit();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditValue('');
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedIds.size > 0 && !editingId) {
        for (const id of selectedIds) {
          onWordDelete(id);
        }
        setSelectedIds(new Set());
      }
    }
  };

  const groupBySpeaker = (wordList: TranscriptWord[]) => {
    const groups: { speaker: string; words: TranscriptWord[] }[] = [];
    let current: TranscriptWord[] = [];
    let currentSpeaker = '';

    for (const word of wordList) {
      const speaker = word.speaker || 'Unknown';
      if (speaker !== currentSpeaker) {
        if (current.length > 0) {
          groups.push({ speaker: currentSpeaker, words: current });
        }
        current = [word];
        currentSpeaker = speaker;
      } else {
        current.push(word);
      }
    }
    if (current.length > 0) {
      groups.push({ speaker: currentSpeaker, words: current });
    }
    return groups;
  };

  const formatTime = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const millis = Math.floor((ms % 1000) / 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  };

  const groups = groupBySpeaker(words);

  return (
    <div className="transcript-editor">
      <div className="transcript-toolbar">
        <span className="transcript-label">Transcript</span>
        <span className="transcript-word-count">{words.length} words</span>
      </div>

      <div className="transcript-content" onKeyDown={handleKeyDown}>
        {groups.map((group, gi) => (
          <div key={gi} className="transcript-speaker-group">
            <div className="transcript-speaker-label">{group.speaker}</div>
            <div className="transcript-words">
              {group.words.map((word) => {
                const isActive =
                  currentTimeMs >= word.startMs && currentTimeMs <= word.endMs;
                const isEditing = editingId === word.id;
                const isSelected = selectedIds.has(word.id);

                return (
                  <span
                    key={word.id}
                    className={`transcript-word ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''} ${word.confidence !== undefined && word.confidence < 0.8 ? 'low-confidence' : ''}`}
                    onClick={(e) => {
                      onWordClick(word);
                      toggleSelect(word.id, e);
                    }}
                    onDoubleClick={() => handleDoubleClick(word)}
                    title={`${formatTime(word.startMs)} — ${formatTime(word.endMs)}${word.confidence !== undefined ? ` (${Math.round(word.confidence * 100)}%)` : ''}`}
                  >
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        className="transcript-word-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      word.text
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        ))}

        {words.length === 0 && (
          <div className="transcript-empty">
            <span className="transcript-empty-icon">🎙</span>
            <span>No transcript yet</span>
            <span className="transcript-empty-sub">
              Load an audio file to generate transcript
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
