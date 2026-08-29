// docs/ui-spec.md #34.2 (Network Error): エラー表示には再試行導線を必ず添える。
export function LoadFailure({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-rose-700">{message}</p>
      <button
        className="inline-flex min-h-11 items-center justify-center border border-rose-300 px-4 text-sm font-bold text-rose-700"
        onClick={onRetry}
        type="button"
      >
        再試行
      </button>
    </div>
  )
}
