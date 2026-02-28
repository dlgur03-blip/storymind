import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 p-4">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">😵</div>
            <h2 className="text-xl font-bold mb-2">앗, 문제가 발생했어요</h2>
            <p className="text-sm text-surface-500 mb-4">{this.state.error?.message || '알 수 없는 오류'}</p>
            <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              className="px-4 py-2 bg-neutral-900 dark:bg-white text-white rounded-lg text-sm">
              새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
