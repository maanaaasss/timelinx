import React, { useEffect } from 'react';

const SECTIONS = [
  {
    title: 'Playback',
    shortcuts: [
      ['Space', 'Play / Pause'],
      ['← →', 'Step one frame'],
      ['Shift + ← →', 'Seek 10 frames'],
      ['Home / End', 'Go to start / end'],
    ],
  },
  {
    title: 'Tools',
    shortcuts: [
      ['V', 'Selection'],
      ['C', 'Razor'],
      ['T', 'Ripple Trim'],
      ['R', 'Roll Trim'],
      ['S', 'Slip'],
      ['Y', 'Slide'],
      ['H', 'Hand (Pan)'],
    ],
  },
  {
    title: 'Editing',
    shortcuts: [
      ['⌘ Z', 'Undo'],
      ['⌘ ⇧ Z', 'Redo'],
      ['⌘ A', 'Select all clips'],
      ['Escape', 'Clear selection'],
      ['Delete', 'Delete selected clip'],
      ['Alt+Click', 'Add marker'],
    ],
  },
];

export function KeyboardShortcuts({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="demo-shortcuts-overlay" onClick={onClose}>
      <div
        className="demo-shortcuts-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="demo-shortcuts-title">Keyboard Shortcuts</h2>

        {SECTIONS.map((section) => (
          <div key={section.title} className="demo-shortcuts-section">
            <div className="demo-shortcuts-section-title">{section.title}</div>
            <div className="demo-shortcuts-grid">
              {section.shortcuts.map(([key, desc]) => (
                <React.Fragment key={key}>
                  <span className="demo-shortcut-key">{key}</span>
                  <span className="demo-shortcut-desc">{desc}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
