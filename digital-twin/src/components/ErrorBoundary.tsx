import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Wraps the highest-risk, least-verifiable part of this build (the
 * procedurally-constructed 3D scene — see README) so a mistake in one
 * geometry/material call renders a small in-place error message instead of
 * a blank white screen for the whole app. React error boundaries must be
 * class components; there is no hook equivalent.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    console.error(`[ErrorBoundary] ${this.props.fallbackTitle}`, error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-hud-bg p-6 text-center">
          <div className="text-sm font-semibold text-hud-red">{this.props.fallbackTitle}</div>
          <div className="max-w-md text-xs text-hud-muted">
            {this.state.error.message || 'An unexpected error occurred while rendering this section.'}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
