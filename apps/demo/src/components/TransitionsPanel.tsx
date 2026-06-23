import React from 'react';
import { Link } from 'lucide-react';

export function TransitionsPanel() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 56,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 14,
        marginBottom: 14,
        color: 'rgba(255,255,255,0.15)',
      }}>
        <Link size={24} strokeWidth={1.5} />
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
        Transitions
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', lineHeight: 1.5 }}>
        Add transitions between clips
      </div>
    </div>
  );
}
