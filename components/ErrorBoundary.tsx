import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service here
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHardReset = () => {
    // Clear local storage to fix potentially corrupted state
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-light-background dark:bg-dark-background p-4 text-light-text dark:text-dark-text">
          <div className="max-w-md w-full bg-light-ui dark:bg-dark-ui rounded-2xl shadow-2xl border border-light-border dark:border-dark-border overflow-hidden">
            
            {/* Header / Graphic */}
            <div className="p-8 flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full animate-pulse"></div>
                <div className="relative bg-light-background dark:bg-dark-background p-4 rounded-full border border-red-100 dark:border-red-900/30">
                  <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              
              <h1 className="text-2xl font-bold mb-2">System Interruption</h1>
              <p className="text-sm text-light-text/70 dark:text-dark-text/70 leading-relaxed">
                WesCore encountered an unexpected error. This might be a temporary glitch or corrupted local data.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="px-8 pb-8 space-y-3">
              <button 
                onClick={this.handleReload}
                className="w-full py-3 bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900 rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-light-primary/20 dark:shadow-dark-primary/20"
              >
                Reload Application
              </button>
              
              <button 
                onClick={this.handleHardReset}
                className="w-full py-3 bg-white dark:bg-zinc-800 border border-light-border dark:border-zinc-700 text-red-500 font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-sm"
              >
                Clear Cache & Reset
              </button>
            </div>

            {/* Technical Details (Collapsible) */}
            <div className="bg-zinc-50 dark:bg-zinc-950 border-t border-light-border dark:border-dark-border p-4">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer list-none text-xs font-mono text-light-text/50 dark:text-dark-text/50 hover:text-light-text/80 dark:hover:text-dark-text/80 transition-colors">
                  <span>View Error Logs</span>
                  <svg className="w-4 h-4 transform group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-4 p-3 bg-white dark:bg-zinc-900 rounded-lg border border-light-border dark:border-dark-border overflow-x-auto">
                  <p className="font-mono text-xs text-red-500 mb-2 font-bold">
                    {this.state.error && this.state.error.toString()}
                  </p>
                  <pre className="font-mono text-[10px] text-light-text/60 dark:text-dark-text/60 leading-relaxed whitespace-pre-wrap">
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              </details>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;