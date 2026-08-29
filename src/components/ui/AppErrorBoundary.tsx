import { Component, type ErrorInfo, type ReactNode } from 'react'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
}

// Convex Query errors are thrown during rendering. Keep them from unmounting
// the entire application and provide a recovery path instead of a blank page.
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // The server-side Convex request ID remains available in browser devtools.
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="mx-auto flex min-h-dvh w-full max-w-2xl items-center px-4 py-6">
          <div className="space-y-3">
            <h1 className="text-xl font-bold">画面を読み込めませんでした</h1>
            <p className="text-sm leading-6 text-text-muted">
              ログイン状態または通信を確認して、もう一度読み込んでください。
            </p>
            <button
              className="min-h-11 border border-attention-border px-4 text-sm font-bold text-attention-body"
              onClick={() => window.location.reload()}
              type="button"
            >
              再読み込み
            </button>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}
