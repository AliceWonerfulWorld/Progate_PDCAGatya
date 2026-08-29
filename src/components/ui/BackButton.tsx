import { ArrowLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

// PDCAの各画面は一直線に進むだけで、直前の画面へ戻る手段が「ホーム」しか
// なかった(=進んだ分だけ迷子になる)。ブラウザ履歴で1画面だけ戻る「戻る」を
// 共通化する。アプリ内遷移でここへ来ていない(履歴が無い/直接開いた)場合は
// ホームへフォールバックする。
export function BackButton() {
  const navigate = useNavigate()
  const location = useLocation()
  const canGoBack = location.key !== 'default'

  return (
    <button
      className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-text-muted transition-colors duration-(--duration-fast) ease-standard hover:text-text active:scale-[0.98]"
      onClick={() => (canGoBack ? navigate(-1) : navigate('/'))}
      type="button"
    >
      <ArrowLeft aria-hidden="true" className="size-4" /> 戻る
    </button>
  )
}
