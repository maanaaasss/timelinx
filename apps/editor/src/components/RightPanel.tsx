import { useState } from 'react';
import { InspectorPanel } from './InspectorPanel';
import { EffectsPanel } from './EffectsPanel';
import { TransitionsPanel } from './TransitionsPanel';
import { KeyframesPanel } from './KeyframesPanel';
import { TextPanel } from './TextPanel';

const TABS = [
  { id: 'inspector', label: 'Inspector' },
  { id: 'effects', label: 'Effects' },
  { id: 'transitions', label: 'Transitions' },
  { id: 'keyframes', label: 'Keyframes' },
  { id: 'text', label: 'Text' },
] as const;

type TabId = typeof TABS[number]['id'];

export function RightPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('inspector');

  return (
    <div className="right-panel">
      <div className="panel-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`panel-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="panel-tab-content">
        {activeTab === 'inspector' && <InspectorPanel />}
        {activeTab === 'effects' && <EffectsPanel />}
        {activeTab === 'transitions' && <TransitionsPanel />}
        {activeTab === 'keyframes' && <KeyframesPanel />}
        {activeTab === 'text' && <TextPanel />}
      </div>
    </div>
  );
}
