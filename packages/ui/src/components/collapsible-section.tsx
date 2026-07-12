import React, { useState, useCallback, type ReactNode } from 'react';

export interface CollapsibleSectionProps {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export const CollapsibleSection = React.memo(function CollapsibleSection({
  title,
  icon,
  defaultOpen = true,
  children,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return (
    <div className={`collapsible-section${className ? ` ${className}` : ''}${isOpen ? ' open' : ''}`}>
      <button
        className="section-header"
        onClick={toggle}
        aria-expanded={isOpen}
        type="button"
      >
        <span className="section-header-icon">{icon}</span>
        <span className="section-header-title">{title}</span>
        <span className="section-chevron" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 4 5 6 7 4" />
          </svg>
        </span>
      </button>
      {isOpen && (
        <div className="section-body">
          {children}
        </div>
      )}
    </div>
  );
});
