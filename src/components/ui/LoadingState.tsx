import { Loader2 } from 'lucide-react'

export function LoadingState({ label = '読み込んでいます。' }: { label?: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-3 py-2">
      <div className="h-5 w-2/5 animate-pulse bg-border-subtle" />
      <div className="h-4 w-full animate-pulse bg-surface-muted" />
      <div className="h-4 w-4/5 animate-pulse bg-surface-muted" />
      <p className="flex items-center gap-2 text-sm text-text-muted">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" /> {label}
      </p>
    </div>
  )
}
