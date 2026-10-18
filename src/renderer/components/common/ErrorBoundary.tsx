import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[Cairn ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          data-testid="cairn-error-boundary"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            backgroundColor: 'var(--bg-app)',
            color: 'var(--text-primary)',
            padding: '32px',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              marginBottom: '16px'
            }}
          >
            <AlertTriangle size={24} />
          </div>

          <h2
            style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '8px',
              color: 'var(--text-primary)'
            }}
          >
            {this.props.fallbackTitle ?? 'Something went wrong'}
          </h2>

          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              maxWidth: '480px',
              marginBottom: '16px',
              lineHeight: 1.5
            }}
          >
            An unexpected error occurred while rendering this component. You can try recovering or reloading the app.
          </p>

          {this.state.error && (
            <pre
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                padding: '12px 16px',
                backgroundColor: 'var(--bg-raised)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: '#f87171',
                maxWidth: '600px',
                overflowX: 'auto',
                marginBottom: '24px',
                textAlign: 'left'
              }}
            >
              {this.state.error.message || String(this.state.error)}
            </pre>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={this.handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>

            <button
              onClick={this.handleReload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: 'var(--accent-primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} />
              <span>Reload App</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
