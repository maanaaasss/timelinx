'use client';

import { KeyboardShortcutsOverlay } from '@timelinx/ui';
import { useState } from 'react';

export function KeyboardShortcutsOverlayExample() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div style={{ padding: 24, background: 'var(--color-background, #1a1a1a)', borderRadius: 8 }}>
      <button
        onClick={() => setIsVisible(true)}
        style={{
          padding: '8px 16px',
          background: 'var(--color-primary, #6366f1)',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        Show Keyboard Shortcuts
      </button>

      <KeyboardShortcutsOverlay
        isVisible={isVisible}
        onClose={() => setIsVisible(false)}
      />
    </div>
  );
}
