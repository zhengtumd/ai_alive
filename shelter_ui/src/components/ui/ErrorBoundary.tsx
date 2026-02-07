import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="cyber-border rounded-lg p-8 max-w-md text-center">
            <div className="text-6xl mb-4">💥</div>
            <h2 className="font-cyber text-2xl text-red-400 mb-4">系统异常</h2>
            <p className="text-gray-300 mb-4">
              抱歉，系统遇到了意外错误。请尝试刷新页面或联系技术支持。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors"
            >
              刷新页面
            </button>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-gray-400 cursor-pointer">错误详情</summary>
                <pre className="text-xs text-gray-500 mt-2 p-2 bg-gray-800 rounded">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}