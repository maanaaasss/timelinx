import React from 'react';
import { formatTimestamp } from '../utils';

type BranchPanelProps = {
  userId: string;
};

// Demo branches for the UI
const DEMO_BRANCHES = [
  {
    id: 'main',
    name: 'main',
    createdAt: new Date(Date.now() - 86400000),
    operations: 42,
    commits: 15,
    active: true,
    parentId: null,
  },
  {
    id: 'feature-1',
    name: 'feature/add-transitions',
    createdAt: new Date(Date.now() - 43200000),
    operations: 8,
    commits: 3,
    active: false,
    parentId: 'main',
  },
  {
    id: 'feature-2',
    name: 'feature/caption-sync',
    createdAt: new Date(Date.now() - 3600000),
    operations: 3,
    commits: 1,
    active: false,
    parentId: 'main',
  },
];

export function BranchPanel({ userId }: BranchPanelProps) {
  const [branches, setBranches] = React.useState(DEMO_BRANCHES);
  const [activeBranch, setActiveBranch] = React.useState('main');
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [newBranchName, setNewBranchName] = React.useState('');

  const handleCreateBranch = () => {
    if (newBranchName.trim()) {
      const newBranch = {
        id: `branch-${Date.now()}`,
        name: newBranchName.trim(),
        createdAt: new Date(),
        operations: 0,
        commits: 0,
        active: false,
        parentId: activeBranch,
      };
      setBranches([...branches, newBranch]);
      setNewBranchName('');
      setShowCreateModal(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Branches</h3>
        <button 
          className="panel-button"
          onClick={() => setShowCreateModal(true)}
        >
          + New Branch
        </button>
      </div>

      {showCreateModal && (
        <div className="modal">
          <div className="modal-content">
            <h4>Create New Branch</h4>
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="Branch name..."
              className="input"
            />
            <div className="modal-actions">
              <button 
                className="panel-button"
                onClick={handleCreateBranch}
                disabled={!newBranchName.trim()}
              >
                Create
              </button>
              <button 
                className="panel-button"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="branch-list">
        {branches.map(branch => (
          <div 
            key={branch.id} 
            className={`branch-item ${branch.id === activeBranch ? 'active' : ''}`}
            onClick={() => setActiveBranch(branch.id)}
          >
            <div className="branch-info">
              <div className="branch-name">{branch.name}</div>
              <div className="branch-meta">
                Created: {formatTimestamp(branch.createdAt)}
                {branch.parentId && ` • Parent: ${branches.find(b => b.id === branch.parentId)?.name || branch.parentId}`}
              </div>
            </div>
            <div className="branch-stats">
              <span className="stat">{branch.operations} ops</span>
              <span className="stat">{branch.commits} commits</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}