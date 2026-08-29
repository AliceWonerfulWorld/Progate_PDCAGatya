import { Archive, History, House, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

const navigationItems: Array<{ label: string; to: string; icon: LucideIcon }> = [
  { label: 'ホーム', to: '/', icon: House },
  { label: 'コレクション', to: '/collection', icon: Archive },
  { label: '履歴', to: '/history', icon: History },
  { label: 'プロフィール', to: '/profile', icon: UserRound },
]

export function BottomNavigation() {
  return (
    <nav aria-label="メインナビゲーション" className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-stone-50/95 backdrop-blur">
      <div className="mx-auto grid h-16 w-full max-w-2xl grid-cols-4 px-2">
        {navigationItems.map(({ icon: Icon, label, to }) => (
          <NavLink
            className={({ isActive }) =>
              `flex min-w-0 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                isActive ? 'text-emerald-700' : 'text-slate-500'
              }`
            }
            key={to}
            to={to}
          >
            <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
