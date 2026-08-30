import type { PropsWithChildren } from "react";
import { OfflineBanner } from "../ui/OfflineBanner";
import { BottomNavigation } from "./BottomNavigation";
import { Header } from "./Header";

type AppShellProps = PropsWithChildren<{
  showBottomNavigation: boolean;
}>;

export function AppShell({ children, showBottomNavigation }: AppShellProps) {
  return (
    <div className="app-canvas text-text">
      <div className="app-shell">
        <Header />
        <OfflineBanner />
        <main
          className={
            showBottomNavigation
              ? "app-page app-page-with-navigation"
              : "app-page"
          }
        >
          {children}
        </main>
        {showBottomNavigation ? <BottomNavigation /> : null}
      </div>
    </div>
  );
}
