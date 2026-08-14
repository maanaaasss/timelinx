import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export default function OG() {
  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        background: '#0a0a0a',
        padding: '80px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #818cf8, #c084fc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <span
          style={{ color: '#ffffff', fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em' }}
        >
          Timelinx
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          color: '#ffffff',
          fontSize: '52px',
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          marginBottom: '24px',
        }}
      >
        <span>Timeline editor engine</span>
        <span style={{ color: '#a1a1aa' }}>for the browser</span>
      </div>
      <div
        style={{
          color: '#a1a1aa',
          fontSize: '22px',
          lineHeight: 1.4,
          maxWidth: '600px',
        }}
      >
        Headless, pure-function dispatch engine with drop-in React UI components.
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    },
  );
}
