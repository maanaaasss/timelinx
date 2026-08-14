'use client';

import { CollapsibleSection } from '@timelinx/ui';

export function CollapsibleSectionExample() {
  return (
    <div
      style={{
        padding: 24,
        background: 'var(--color-background, #1a1a1a)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <CollapsibleSection title="Transform" defaultOpen={true}>
        <div style={{ fontSize: 13, color: 'var(--color-muted, #aaa)' }}>
          <p style={{ margin: '0 0 8px' }}>Position, scale, and rotation controls.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <label style={{ fontSize: 12 }}>
              X <input type="number" defaultValue={0} style={{ width: 60, marginLeft: 4 }} />
            </label>
            <label style={{ fontSize: 12 }}>
              Y <input type="number" defaultValue={0} style={{ width: 60, marginLeft: 4 }} />
            </label>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Opacity" defaultOpen={false}>
        <div style={{ fontSize: 13, color: 'var(--color-muted, #aaa)' }}>
          <p style={{ margin: 0 }}>Layer opacity and blend mode settings.</p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Compositing" defaultOpen={false}>
        <div style={{ fontSize: 13, color: 'var(--color-muted, #aaa)' }}>
          <p style={{ margin: 0 }}>Blend mode, masks, and track matte options.</p>
        </div>
      </CollapsibleSection>
    </div>
  );
}
