import React from 'react';
import { Bookmark } from 'lucide-react';

export function MarkersPanel() {
  return (
    <div className="panel-empty" style={{ padding: '40px 20px' }}>
      <div className="panel-empty-icon" style={{ marginBottom: 14 }}>
        <Bookmark size={24} strokeWidth={1.5} />
      </div>
      <div className="panel-empty-title">
        Markers
      </div>
      <div className="panel-empty-sub">
        Add markers to your timeline
      </div>
    </div>
  );
}
