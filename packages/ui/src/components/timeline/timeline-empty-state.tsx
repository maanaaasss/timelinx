import { CloudUpload } from 'lucide-react';
import { cn } from '../../shared/cn';

export interface TimelineEmptyStateProps {
  /** Called when the user clicks the upload area. */
  onUpload?: () => void;
  /** Label text. Defaults to "Upload Media". */
  label?: string;
  className?: string;
}

/**
 * Empty-state overlay shown inside a track body when no clips are present.
 * Displays a cloud-upload icon with a label inside a dashed border zone,
 * matching the CapCut / Canva-style design.
 */
export function TimelineEmptyState({
  onUpload,
  label = 'Upload Media',
  className,
}: TimelineEmptyStateProps) {
  return (
    <div
      className={cn('tl-empty-state-v3', onUpload && 'is-clickable', className)}
      onClick={onUpload}
      role={onUpload ? 'button' : undefined}
      tabIndex={onUpload ? 0 : undefined}
      onKeyDown={
        onUpload
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onUpload();
              }
            }
          : undefined
      }
    >
      <CloudUpload size={20} className="tl-empty-state-v3-icon" />
      <span className="tl-empty-state-v3-label">{label}</span>
    </div>
  );
}
