import { Component } from 'react';
import { RefreshCw } from 'lucide-react';

// Catches render-time crashes so one broken page never blanks the whole app.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('UI error:', error, info?.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="card mx-auto max-w-lg space-y-3 py-10 text-center">
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="text-sm text-slate-500">
          An unexpected error stopped this page from rendering. Reloading usually fixes it.
        </p>
        <button className="btn" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4" /> Reload
        </button>
      </div>
    );
  }
}
