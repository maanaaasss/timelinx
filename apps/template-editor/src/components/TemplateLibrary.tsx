import React from 'react';

interface Template {
  id: string;
  name: string;
  category: string;
  color: string;
}

interface Props {
  templates: Template[];
  selectedId: string;
  category: string;
  onCategoryChange: (cat: string) => void;
  onSelect: (id: string) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'social', label: 'Social' },
  { id: 'docs', label: 'Docs' },
  { id: 'print', label: 'Print' },
  { id: 'start', label: 'Start' },
];

export function TemplateLibrary({ templates, selectedId, category, onCategoryChange, onSelect }: Props) {
  const filtered = category === 'all' ? templates : templates.filter((t) => t.category === category);

  return (
    <div className="tpl-library">
      <div className="tpl-lib-categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`tpl-lib-cat-btn ${category === cat.id ? 'active' : ''}`}
            onClick={() => onCategoryChange(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="tpl-lib-grid">
        {filtered.map((tpl) => (
          <button
            key={tpl.id}
            className={`tpl-lib-card ${selectedId === tpl.id ? 'selected' : ''}`}
            onClick={() => onSelect(tpl.id)}
          >
            <div className="tpl-lib-thumb" style={{ background: tpl.color }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </div>
            <span className="tpl-lib-name">{tpl.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
