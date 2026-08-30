import { Archive, History, House, Ticket, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

const navigationItems: Array<{ label: string; to: string; icon: LucideIcon }> =
  [
    { label: "ホーム", to: "/", icon: House },
    { label: "ガチャ", to: "/gacha", icon: Ticket },
    { label: "コレクション", to: "/collection", icon: Archive },
    { label: "履歴", to: "/history", icon: History },
    { label: "プロフィール", to: "/profile", icon: UserRound },
  ];

export function BottomNavigation() {
  return (
    <nav aria-label="メインナビゲーション" className="app-bottom-navigation">
      <div className="grid grid-cols-5 gap-1 p-1.5">
        {navigationItems.map(({ icon: Icon, label, to }) => (
          <NavLink
            className={({ isActive }) =>
              `flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-bold transition-colors duration-(--duration-fast) ease-standard active:scale-[0.97] ${
                isActive
                  ? "bg-primary-subtle text-primary shadow-sm"
                  : "text-text-subtle"
              }`
            }
            key={to}
            to={to}
          >
            <Icon aria-hidden="true" className="size-5" strokeWidth={2.25} />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
