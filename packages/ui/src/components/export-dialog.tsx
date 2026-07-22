/**
 * Export Dialog — Phase 11
 *
 * Modal overlay showing export progress, cancel button, download link,
 * and error handling for browser compatibility issues.
 */
import React, { useEffect } from 'react';
import type { ExportState } from '../hooks/use-export';

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exportState: ExportState;
  onCancel: () => void;
  onStartExport: () => void;
  isSupported: boolean;
}

export function ExportDialog({
  isOpen,
  onClose,
  exportState,
  onCancel,
  onStartExport,
  isSupported,
}: ExportDialogProps) {
  // Auto-start export when dialog opens and browser is supported
  useEffect(() => {
    if (isOpen && isSupported && exportState.status === 'idle') {
      onStartExport();
    }
  }, [isOpen, isSupported, exportState.status, onStartExport]);

  // Auto-close on complete after a brief delay
  useEffect(() => {
    if (exportState.status === 'complete') {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [exportState.status, onClose]);

  if (!isOpen) return null;

  const pct = Math.round(exportState.progress * 100);
  const elapsed = exportState.status === 'encoding'
    ? 'Exporting...'
    : exportState.status === 'preparing'
      ? 'Preparing...'
      : exportState.status === 'complete'
        ? 'Complete!'
        : exportState.status === 'error'
          ? 'Export failed'
          : '';

  return (
    <div className="export-dialog-backdrop" onClick={exportState.status !== 'encoding' ? onClose : undefined}>
      <div className="export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="export-dialog-header">
          <h3 className="export-dialog-title">Export Timeline</h3>
          {exportState.status !== 'encoding' && (
            <button className="export-dialog-close" onClick={onClose}>
              &times;
            </button>
          )}
        </div>

        <div className="export-dialog-body">
          {!isSupported ? (
            <div className="export-dialog-error">
              <p className="export-error-title">Browser Not Supported</p>
              <p className="export-error-message">
                This browser does not support <code>captureStream</code> or <code>MediaRecorder</code>.
                Please use Chrome, Edge, or Firefox for timeline export.
              </p>
            </div>
          ) : exportState.status === 'error' ? (
            <div className="export-dialog-error">
              <p className="export-error-title">Export Failed</p>
              <p className="export-error-message">{exportState.error}</p>
            </div>
          ) : exportState.status === 'complete' ? (
            <div className="export-dialog-complete">
              <p className="export-complete-title">Export Complete</p>
              {exportState.downloadUrl && (
                <a
                  className="export-download-link"
                  href={exportState.downloadUrl}
                  download={exportState.fileName}
                >
                  Download {exportState.fileName}
                </a>
              )}
              <p className="export-complete-hint">Auto-downloading... This dialog will close shortly.</p>
            </div>
          ) : (
            <div className="export-dialog-progress">
              <p className="export-progress-status">{elapsed}</p>
              <div className="export-progress-bar-track">
                <div
                  className="export-progress-bar-fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="export-progress-pct">{pct}%</p>
            </div>
          )}
        </div>

        <div className="export-dialog-footer">
          {exportState.status === 'encoding' && (
            <button className="export-cancel-btn" onClick={onCancel}>
              Cancel
            </button>
          )}
          {(exportState.status === 'idle' || exportState.status === 'error') && isSupported && (
            <button className="export-retry-btn" onClick={onStartExport}>
              {exportState.status === 'error' ? 'Retry' : 'Start Export'}
            </button>
          )}
          {exportState.status !== 'encoding' && (
            <button className="export-close-btn" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
