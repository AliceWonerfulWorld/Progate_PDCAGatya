import { Sparkles } from 'lucide-react'

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-stone-50">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-2 px-4">
        <Sparkles aria-hidden="true" className="size-5 text-emerald-700" strokeWidth={2.25} />
        <span className="text-sm font-bold tracking-wide">PDCA GACHA</span>
      </div>
    </header>
  )
}
