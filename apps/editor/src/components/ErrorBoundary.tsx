import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback renderer. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level runtime error boundary (plan §6 P1, task 1 / §8 "Failure behavior").
 *
 * A render/runtime crash must not leave a blank page. We show a recoverable
 * message and a reset action rather than letting the whole editor disappear.
 * Diagnostic detail is logged; project media bytes are never included here.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Structured logging transport is a P6 concern; console is the first step.
    console.error('[editor] uncaught error', error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset);
      return (
        <main
          role="alert"
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
          <div style={{ maxWidth: 480 }}>
            <h1 style={{ fontSize: 20, marginBottom: 12 }}>Something went wrong</h1>
            <p style={{ lineHeight: 1.5, marginBottom: 16, opacity: 0.85 }}>
              The editor hit an unexpected error. Your current work may be unsaved. You can try to
              recover, or reload the page.
            </p>
            <pre
              style={{
                fontSize: 12,
                background: '#0d1117',
                padding: 12,
                borderRadius: 6,
                overflow: 'auto',
                marginBottom: 16,
                opacity: 0.8,
              }}
            >
              {error.message}
            </pre>
            <button
              onClick={this.reset}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                background: '#2d72d2',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Try to recover
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
