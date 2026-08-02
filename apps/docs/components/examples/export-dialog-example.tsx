'use client';

import { ExportDialog } from '@timelinx/ui';
import type { ExportState } from '@timelinx/ui';
import { useState } from 'react';

const mockExportState: ExportState = {
  status: 'idle',
  progress: 0,
  error: null,
  downloadUrl: null,
  fileName: 'timeline-export.mp4',
};

export function ExportDialogExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ padding: 24, background: 'var(--color-background, #1a1a1a)', borderRadius: 8 }}>
      <button
        onClick={() => setIsOpen(true)}
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
        Open Export Dialog
      </button>

      <ExportDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        exportState={mockExportState}
        onCancel={() => {}}
        onStartExport={() => {}}
        isSupported={true}
      />
    </div>
  );
}
