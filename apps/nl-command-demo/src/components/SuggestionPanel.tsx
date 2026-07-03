import React from 'react';
import { Check, X, Sparkles } from 'lucide-react';
import type { SuggestedTransaction } from '@timelinx/ai';

type SuggestionPanelProps = {
  suggestions: SuggestedTransaction[];
  onApply: (id: string) => void;
  onReject: (id: string) => void;
};

export function SuggestionPanel({ suggestions, onApply, onReject }: SuggestionPanelProps) {
  if (suggestions.length === 0) {
    return (
      <div className="suggestion-panel empty">
        <Sparkles size={24} />
        <p>No suggestions yet. Enter a command to get started.</p>
      </div>
    );
  }

  return (
    <div className="suggestion-panel">
      <h3>Suggestions ({suggestions.length})</h3>
      
      <div className="suggestion-list">
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="suggestion-card">
            <div className="suggestion-header">
              <span className="suggestion-category">{suggestion.category}</span>
              <span className={`suggestion-confidence ${suggestion.confidence}`}>
                {suggestion.confidence}
              </span>
            </div>
            
            <div className="suggestion-content">
              <strong>{suggestion.label}</strong>
              {suggestion.description && (
                <p className="suggestion-description">{suggestion.description}</p>
              )}
            </div>

            {suggestion.preview && (
              <div className="suggestion-preview">
                <PreviewContent preview={suggestion.preview} />
              </div>
            )}

            <div className="suggestion-actions">
              <button
                onClick={() => onApply(suggestion.id)}
                className="suggestion-apply"
              >
                <Check size={14} />
                Apply
              </button>
              <button
                onClick={() => onReject(suggestion.id)}
                className="suggestion-reject"
              >
                <X size={14} />
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewContent({ preview }: { preview: SuggestedTransaction['preview'] }) {
  if (!preview) return null;

  switch (preview.type) {
    case 'command':
      return (
        <div className="preview-command">
          <span className="preview-label">Intent:</span> {preview.intent}
          <br />
          <span className="preview-label">Input:</span> {preview.input}
        </div>
      );
    case 'caption':
      return (
        <div className="preview-caption">
          <span className="preview-label">Caption:</span> "{preview.text}"
          <br />
          <span className="preview-label">Frames:</span> {preview.startFrame} - {preview.endFrame}
        </div>
      );
    case 'scene':
      return (
        <div className="preview-scene">
          <span className="preview-label">Scenes detected:</span> {preview.scenes.length}
          <br />
          {preview.scenes.slice(0, 3).map((scene, i) => (
            <span key={i} className="scene-marker">
              Frame {scene.frame} ({(scene.confidence * 100).toFixed(0)}%)
            </span>
          ))}
        </div>
      );
    case 'silence':
      return (
        <div className="preview-silence">
          <span className="preview-label">Silence regions:</span> {preview.regions.length}
          <br />
          <span className="preview-label">Total frames:</span> {preview.totalFrames}
        </div>
      );
    default:
      return null;
  }
}
