// src/components/common/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service in production
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <section className="rounded-xl border border-red-800/40 bg-red-950/60 p-6 text-center text-red-100 shadow-lg shadow-red-900/30">
          <h2 className="mb-2 text-xl font-bold">ë¬¸ì œê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤</h2>
          <p className="mb-4 text-sm text-red-200">
            ?ˆê¸°ì¹??Šì? ?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤. ? ì‹œ ???¤ì‹œ ?œë„??ì£¼ì„¸??
          </p>
          {this.state.error && (
            <p className="mb-4 text-xs text-red-300/70">{this.state.error.message}</p>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            ?¤ì‹œ ?œë„
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
