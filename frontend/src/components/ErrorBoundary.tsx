'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryState {
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (props: { error: Error; reset: () => void }) => React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback({ error: this.state.error, reset: this.reset });
      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/20 bg-destructive/5 px-6 py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div>
            <h3 className="text-base font-semibold">문제가 발생했어요</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">{this.state.error.message}</p>
          </div>
          <Button onClick={this.reset} size="sm">다시 시도</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
