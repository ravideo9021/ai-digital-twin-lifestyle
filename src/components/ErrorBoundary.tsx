import { Component, type ErrorInfo, type ReactNode } from 'react'

/** Contains render errors to the current screen instead of blanking the app. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[soma] screen crashed', error, info.componentStack)
  }
  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="card p-8 max-w-lg mx-auto mt-16 text-center">
        <div className="t-title3">Something went wrong</div>
        <p className="t-callout text-label-2 mt-2">This screen hit an unexpected error. Your data is safe.</p>
        <button className="btn btn-primary mt-5" onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    )
  }
}
