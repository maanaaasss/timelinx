import React, { useState, Children, isValidElement, type ReactNode } from 'react';

export interface TabDefinition {
  id: string;
  label: string;
}

export interface TabbedPanelProps {
  tabs: readonly TabDefinition[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  children: ReactNode;
  className?: string;
}

export const TabbedPanel = React.memo(function TabbedPanel({
  tabs,
  activeTab: controlledTab,
  onTabChange,
  children,
  className,
}: TabbedPanelProps) {
  const [internalTab, setInternalTab] = useState(tabs[0]?.id ?? '');
  const activeTab = controlledTab ?? internalTab;

  const handleTabChange = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    } else {
      setInternalTab(tabId);
    }
  };

  const childrenArray = Children.toArray(children);
  const activeIndex = tabs.findIndex((t) => t.id === activeTab);
  const activeChild = activeIndex >= 0 ? childrenArray[activeIndex] : null;

  return (
    <div className={`tabbed-panel${className ? ` ${className}` : ''}`}>
      <div className="panel-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`panel-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tabbed-panel-content">
        {activeChild}
      </div>
    </div>
  );
});
