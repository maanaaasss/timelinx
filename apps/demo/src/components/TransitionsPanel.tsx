import React from 'react';
import { Link } from 'lucide-react';

export function TransitionsPanel() {
  return (
    <div className="panel-empty" style={{ padding: '40px 20px' }}>
      <div className="panel-empty-icon" style={{ marginBottom: 14 }}>
        <Link size={24} strokeWidth={1.5} />
      </div>
      <div className="panel-empty-title">
        Transitions
      </div>
      <div className="panel-empty-sub">
        Add transitions between clips
      </div>
    </div>
  );
}
