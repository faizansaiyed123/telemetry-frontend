import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    console.error("Telemetry UI error", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Telemetry</div>
            <h1 className="mt-3 text-2xl font-semibold text-white">Something went wrong</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">The workspace hit an unexpected UI error. Reload the page to restore the application.</p>
            <button onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950">Reload workspace</button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
