import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SafaaiWala Error Caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
          <div className="bg-slate-800 border border-red-500/40 p-8 rounded-2xl max-w-lg w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/40">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Something went wrong / कुछ गड़बड़ हुई</h2>
            <p className="text-slate-300 text-sm mb-6">
              The application encountered an unexpected error. Don't worry, your offline data is safe.
            </p>
            <button
              onClick={this.handleReset}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto transition"
            >
              <RefreshCw className="w-4 h-4" /> Reload SafaaiWala / पुनः लोड करें
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
