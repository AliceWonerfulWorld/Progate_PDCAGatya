import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

// docs/acceptance-criteria.md AC-PWA-003/004:
// Offlineで更新操作をしても成功したように見せず、Online復帰後にretryできることを示す。
export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div
      className="flex items-center justify-center gap-2 bg-notice-bg px-4 py-2 text-sm font-semibold text-notice"
      role="status"
    >
      <WifiOff aria-hidden="true" className="size-4" />
      オフラインです。保存の操作はオンラインに戻ってからやり直してください。
    </div>
  )
}
