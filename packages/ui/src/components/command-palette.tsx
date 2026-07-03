import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useEngine } from '@timelinx/react';
import { useTimelineContext } from '../context/timeline-context';

export interface CommandPaletteProps {
  isVisible: boolean;
  onClose: () => void;
  className?: string;
}

interface Command {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

export const CommandPalette = React.memo(function CommandPalette({
  isVisible,
  onClose,
  className,
}: CommandPaletteProps) {
  const { engine } = useTimelineContext();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = useMemo(() => [
    // Tools
    { id: 'tool-selection', label: 'Selection tool', category: 'Tools', shortcut: 'V', action: () => engine.activateTool('selection') },
    { id: 'tool-razor', label: 'Razor tool', category: 'Tools', shortcut: 'C', action: () => engine.activateTool('razor') },
    { id: 'tool-ripple-trim', label: 'Ripple Trim tool', category: 'Tools', shortcut: 'T', action: () => engine.activateTool('ripple-trim') },
    { id: 'tool-roll-trim', label: 'Roll Trim tool', category: 'Tools', shortcut: 'R', action: () => engine.activateTool('roll-trim') },
    { id: 'tool-slip', label: 'Slip tool', category: 'Tools', shortcut: 'S', action: () => engine.activateTool('slip') },
    { id: 'tool-slide', label: 'Slide tool', category: 'Tools', shortcut: 'Y', action: () => engine.activateTool('slide') },
    { id: 'tool-hand', label: 'Hand tool', category: 'Tools', shortcut: 'H', action: () => engine.activateTool('hand') },

    // Playback
    { id: 'play', label: 'Play / Pause', category: 'Playback', shortcut: 'Space', action: () => {
      const snapshot = engine.getSnapshot();
      const isPlaying = snapshot.playhead.isPlaying;
      if (engine.playbackEngine) {
        if (isPlaying) {
          engine.playbackEngine.pause();
        } else {
          engine.playbackEngine.play();
        }
      }
    }},
    { id: 'seek-start', label: 'Go to start', category: 'Playback', shortcut: 'Home', action: () => engine.seekTo(0 as any) },
    { id: 'seek-end', label: 'Go to end', category: 'Playback', shortcut: 'End', action: () => {
      const state = engine.getState();
      engine.seekTo((state.timeline.duration as number - 1) as any);
    }},

    // Edit
    { id: 'undo', label: 'Undo', category: 'Edit', shortcut: 'Cmd+Z', action: () => engine.undo() },
    { id: 'redo', label: 'Redo', category: 'Edit', shortcut: 'Cmd+Shift+Z', action: () => engine.redo() },
    { id: 'select-all', label: 'Select all clips', category: 'Edit', shortcut: 'Cmd+A', action: () => {
      const state = engine.getState();
      const allIds = new Set<string>();
      for (const track of state.timeline.tracks) {
        for (const clip of track.clips) {
          allIds.add(clip.id as string);
        }
      }
      engine.setSelectedClipIds(allIds);
    }},
    { id: 'clear-selection', label: 'Clear selection', category: 'Edit', shortcut: 'Escape', action: () => engine.clearSelection() },

    // View
    { id: 'zoom-in', label: 'Zoom in', category: 'View', action: () => {
      console.log('Zoom in');
    }},
    { id: 'zoom-out', label: 'Zoom out', category: 'View', action: () => {
      console.log('Zoom out');
    }},
  ], [engine]);

  const filteredCommands = query
    ? commands.filter((cmd) =>
        cmd.label.toLowerCase().includes(query.toLowerCase()) ||
        cmd.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onClose, filteredCommands, selectedIndex]);

  useEffect(() => {
    if (isVisible) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isVisible]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isVisible) return null;

  return (
    <div className={`command-palette${className ? ` ${className}` : ''}`}>
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="palette-content">
        <div className="palette-input-container">
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            placeholder="Type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="palette-results">
          {filteredCommands.length === 0 ? (
            <div className="palette-empty">
              <p>No commands found</p>
            </div>
          ) : (
            <ul className="palette-list">
              {filteredCommands.map((command, index) => (
                <li
                  key={command.id}
                  className={`palette-item${index === selectedIndex ? ' selected' : ''}`}
                  onClick={() => {
                    command.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="palette-item-label">{command.label}</span>
                  <span className="palette-item-category">{command.category}</span>
                  {command.shortcut && (
                    <kbd className="palette-item-shortcut">{command.shortcut}</kbd>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
});
