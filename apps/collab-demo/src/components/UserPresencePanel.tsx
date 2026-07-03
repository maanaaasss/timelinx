import React, { useState, useEffect } from 'react';
import type { PresenceManager, UserPresence } from '@timelinx/collab';
import { Users } from 'lucide-react';

type UserPresencePanelProps = {
  presenceManager: PresenceManager;
  currentUserId: string;
};

export function UserPresencePanel({ presenceManager, currentUserId }: UserPresencePanelProps) {
  const [presences, setPresences] = useState<UserPresence[]>([]);

  useEffect(() => {
    // Update presences periodically
    const interval = setInterval(() => {
      setPresences(presenceManager.getActivePresences());
    }, 1000);

    // Listen for presence updates
    const onPresenceChangeHandler = () => {
      setPresences(presenceManager.getActivePresences());
    };
    presenceManager.onPresenceChange(onPresenceChangeHandler);

    return () => {
      clearInterval(interval);
      presenceManager.onPresenceChange(() => {});
    };
  }, [presenceManager]);

  return (
    <div className="user-presence-panel">
      <div className="panel-header">
        <Users size={16} />
        <h3>Active Users ({presences.length})</h3>
      </div>

      <div className="user-list">
        {presences.map((presence) => (
          <div
            key={presence.userId}
            className={`user-card ${presence.userId === currentUserId ? 'local' : ''}`}
          >
            <div
              className="user-avatar"
              style={{ backgroundColor: presence.color }}
            >
              {presence.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">
                {presence.displayName}
                {presence.userId === currentUserId && ' (You)'}
              </span>
              <span className="user-status">
                {presence.cursor ? `Frame ${presence.cursor.frame}` : 'No cursor'}
              </span>
            </div>
            <div className={`user-indicator ${presence.isActive ? 'active' : ''}`} />
          </div>
        ))}
      </div>

      {presences.length === 0 && (
        <div className="empty-state">
          <p>No other users online</p>
        </div>
      )}
    </div>
  );
}
