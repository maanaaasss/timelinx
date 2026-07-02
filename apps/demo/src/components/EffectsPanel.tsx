import React from 'react';
import { Sparkles } from 'lucide-react';

export function EffectsPanel() {
  return (
    <div className="panel-empty" style={{ padding: '40px 20px' }}>
      <div className="panel-empty-icon" style={{ marginBottom: 14 }}>
        <Sparkles size={24} strokeWidth={1.5} />
      </div>
      <div className="panel-empty-title">
        Effects
      </div>
      <div className="panel-empty-sub">
        Select a clip to add effects
      </div>
    </div>
  );
}
