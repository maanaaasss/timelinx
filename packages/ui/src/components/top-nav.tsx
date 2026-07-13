import React from 'react';
import { ChevronLeft, Cloud, ChevronDown, Download } from 'lucide-react';

export interface TopNavProps {
  projectName?: string;
  onBack?: () => void;
  onExport?: () => void;
  className?: string;
}

export const TopNav = React.memo(function TopNav({
  projectName = 'Video Popular Vlog_Duplicate',
  onBack,
  onExport,
  className,
}: TopNavProps) {
  return (
    <header className={`top-nav${className ? ` ${className}` : ''}`}>
      <div className="top-nav-left">
        <button className="top-nav-btn" title="Back" onClick={onBack}>
          <ChevronLeft size={18} />
        </button>
        <Cloud size={18} />
        <span>Uploaded</span>
      </div>

      <div className="top-nav-center">
        <button className="top-nav-btn" title="Project files">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
        </button>
        <span>{projectName}</span>
        <ChevronDown size={14} />
      </div>

      <div className="top-nav-right">
        <button className="top-nav-export-btn" onClick={onExport}>
          <span>Export</span>
          <Download size={14} />
        </button>
      </div>
    </header>
  );
});
