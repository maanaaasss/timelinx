'use client';

import { ZoomControls } from '@timelinx/ui';
import { useState } from 'react';

export function ZoomControlsExample() {
  const [ppf, setPpf] = useState(8);

  return (
    <div style={{ padding: 24, background: 'var(--color-background, #1a1a1a)', borderRadius: 8 }}>
      <ZoomControls ppf={ppf} onPpfChange={setPpf} />
    </div>
  );
}
