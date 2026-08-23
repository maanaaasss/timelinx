import { useMemo, type ReactNode } from 'react';
import { detectCapabilities, type CapabilityReport } from '../session/capabilities';

interface CapabilityPreflightProps {
  children: ReactNode;
  /** Injectable for tests / storybook; defaults to a live browser probe. */
  report?: CapabilityReport;
}

const SUPPORTED_BROWSERS = 'the latest desktop version of Chrome or Edge';

/**
 * Gate that runs the browser capability preflight (plan §6 P1, task 5).
 * When a required capability is missing it shows an actionable message and does
 * not mount the editor, so the user never hits a cryptic failure mid-import or
 * mid-export. When everything required is present it renders the editor.
 */
export function CapabilityPreflight({ children, report }: CapabilityPreflightProps) {
  const resolved = useMemo(() => report ?? detectCapabilities(), [report]);

  if (resolved.supported) {
    return <>{children}</>;
  }

  return (
    <main
      role="alert"
      aria-labelledby="preflight-title"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#1c1f26',
        color: '#e8eaed',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <h1 id="preflight-title" style={{ fontSize: 20, marginBottom: 12 }}>
          This browser can’t run the editor
        </h1>
        <p style={{ lineHeight: 1.5, marginBottom: 16, opacity: 0.85 }}>
          The editor needs a few browser features that aren’t available here. Please switch to{' '}
          {SUPPORTED_BROWSERS} and reload.
        </p>
        <ul style={{ listStyle: 'none', display: 'grid', gap: 8 }}>
          {resolved.results
            .filter((r) => r.required)
            .map((r) => (
              <li
                key={r.id}
                style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14 }}
              >
                <span aria-hidden style={{ color: r.ok ? '#3fb950' : '#f85149' }}>
                  {r.ok ? '✓' : '✗'}
                </span>
                <span>
                  <strong>{r.label}</strong>
                  <span style={{ opacity: 0.7 }}> — {r.detail}</span>
                </span>
              </li>
            ))}
        </ul>
      </div>
    </main>
  );
}
