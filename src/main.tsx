import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[App Crash Captured by ErrorBoundary]', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto text-amber-400 text-2xl font-bold">
              !
            </div>
            <h2 className="text-xl font-bold text-white">ተወዳጅ ኦንላይን ሎተሪ</h2>
            <p className="text-sm text-slate-300">
              መተግበሪያውን ሲከፍቱ ጥቂት መዘግየት አጋጥሟል። እባክዎ "እንደገና ይክፈቱ" የሚለውን ይጫኑ።
            </p>
            {this.state.error?.message && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-left font-mono text-xs text-rose-400 break-all max-h-32 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={() => {
                localStorage.removeItem('enat_user_profile');
                localStorage.removeItem('gol_user_profile');
                window.location.reload();
              }}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg transition-all text-sm"
            >
              🔄 እንደገና ይክፈቱ (Refresh App)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
