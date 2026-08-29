import type { ReactNode } from 'react'

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="space-y-3 border-y border-slate-200 py-8 text-center">
      <p className="text-base font-bold text-slate-800">{title}</p>
      <p className="mx-auto max-w-sm text-sm leading-6 text-slate-600">{description}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  )
}
