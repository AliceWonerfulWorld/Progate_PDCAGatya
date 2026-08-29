// docs/ui-spec.md #34.2 (Network Error): エラー表示には再試行導線を必ず添える。
export function LoadFailure({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div aria-live="polite" className="space-y-3 border-y border-attention-bg py-6">
      <p className="text-sm font-semibold text-attention-body">{message}</p>
      <p className="text-sm leading-6 text-text-muted">通信状態を確認して、もう一度お試しください。</p>
      <button
        className="inline-flex min-h-11 items-center justify-center border border-attention-border px-4 text-sm font-bold text-attention-body"
        onClick={onRetry}
        type="button"
      >
        再試行
      </button>
    </div>
  )
}
