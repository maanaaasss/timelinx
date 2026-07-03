import React, { useState, useEffect, useCallback } from 'react';

export interface KeyboardShortcutsOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  className?: string;
}

const SHORTCUTS = [
  { category: 'Tools', shortcuts: [
    { key: 'V', description: 'Selection tool' },
    { key: 'C', description: 'Razor tool' },
    { key: 'T', description: 'Ripple Trim tool' },
    { key: 'R', description: 'Roll Trim tool' },
    { key: 'S', description: 'Slip tool' },
    { key: 'Y', description: 'Slide tool' },
    { key: 'H', description: 'Hand tool (pan)' },
  ]},
  { category: 'Playback', shortcuts: [
    { key: 'Space', description: 'Play / Pause' },
    { key: '←', description: 'Step back 1 frame' },
    { key: '→', description: 'Step forward 1 frame' },
    { key: 'Shift+←', description: 'Step back 10 frames' },
    { key: 'Shift+→', description: 'Step forward 10 frames' },
    { key: 'Home', description: 'Go to start' },
    { key: 'End', description: 'Go to end' },
  ]},
  { category: 'Edit', shortcuts: [
    { key: 'Cmd+Z', description: 'Undo' },
    { key: 'Cmd+Shift+Z', description: 'Redo' },
    { key: 'Delete', description: 'Delete selected clips' },
    { key: 'Cmd+A', description: 'Select all clips' },
    { key: 'Escape', description: 'Clear selection' },
  ]},
  { category: 'View', shortcuts: [
    { key: '?', description: 'Show keyboard shortcuts' },
    { key: 'Cmd+K', description: 'Open command palette' },
  ]},
];

export const KeyboardShortcutsOverlay = React.memo(function KeyboardShortcutsOverlay({
  isVisible,
  onClose,
  className,
}: KeyboardShortcutsOverlayProps) {
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className={`keyboard-shortcuts-overlay${className ? ` ${className}` : ''}`}>
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="overlay-content">
        <div className="overlay-header">
          <h2 className="overlay-title">Keyboard Shortcuts</h2>
          <button className="overlay-close-btn" onClick={onClose} title="Close">
            ×
          </button>
        </div>

        <div className="shortcuts-grid">
          {SHORTCUTS.map((category) => (
            <div key={category.category} className="shortcut-category">
              <h3 className="category-title">{category.category}</h3>
              <ul className="shortcut-list">
                {category.shortcuts.map((shortcut) => (
                  <li key={shortcut.key} className="shortcut-item">
                    <kbd className="shortcut-key">{shortcut.key}</kbd>
                    <span className="shortcut-description">{shortcut.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
