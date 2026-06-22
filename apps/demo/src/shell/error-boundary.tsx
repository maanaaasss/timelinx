import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Timeline error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '2rem',
            color: '#e84848',
            fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
            textAlign: 'center',
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: '1rem', opacity: 0.6 }}
          >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
            Something went wrong
          </h2>
          <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', opacity: 0.6, maxWidth: '380px' }}>
            The timeline encountered an unexpected error. Try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid rgba(232, 72, 72, 0.2)',
              borderRadius: '4px',
              background: 'rgba(232, 72, 72, 0.08)',
              color: '#e84848',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
              fontWeight: 500,
            }}
          >
            Refresh page
          </button>
          {this.state.error && (
            <details style={{ marginTop: '1rem', maxWidth: '480px', width: '100%' }}>
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: '0.6875rem',
                  opacity: 0.4,
                  textAlign: 'left',
                }}
              >
                Error details
              </summary>
              <pre
                style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  background: 'rgba(232, 72, 72, 0.04)',
                  borderRadius: '4px',
                  fontSize: '0.6875rem',
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  textAlign: 'left',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
