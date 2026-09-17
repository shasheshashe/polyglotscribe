import React from 'react';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import { AlertTriangle, RefreshCw } from 'lucide-react';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-200">
      <div className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-slate-400 text-sm mb-6">
          The application encountered an unexpected error.
        </p>
        
        <div className="bg-slate-950 rounded-xl p-4 w-full mb-8 overflow-auto border border-slate-800">
          <p className="text-rose-400 text-xs font-mono text-left break-words">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
        </div>

        <button
          onClick={() => {
            resetErrorBoundary();
            window.location.reload();
          }}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Reload Application
        </button>
      </div>
    </div>
  );
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ReactErrorBoundary>
  );
}
