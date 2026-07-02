import React from 'react';
import { Diamond } from 'lucide-react';

export function KeyframesPanel() {
  return (
    <div className="panel-empty" style={{ padding: '40px 20px' }}>
      <div className="panel-empty-icon" style={{ marginBottom: 14 }}>
        <Diamond size={24} strokeWidth={1.5} />
      </div>
      <div className="panel-empty-title">
        Keyframes
      </div>
      <div className="panel-empty-sub">
        Animate clip properties
      </div>
    </div>
  );
}
