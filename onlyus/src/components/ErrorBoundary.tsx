import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Privacy rule: never log PII or send errors to third-party trackers.
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center bg-ink-950 text-white">
          <div className="glass rounded-3xl p-6 max-w-sm w-full space-y-4 border border-white/15">
            <div className="text-3xl">💜</div>
            <h1 className="text-lg font-bold">Something went wrong</h1>
            <p className="text-xs text-white/65">
              ONLYUS hit an unexpected error. Your messages and data are safe.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2.5 rounded-2xl bg-love-gradient text-xs font-semibold shadow-glow-pink"
            >
              Reload ONLYUS
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
