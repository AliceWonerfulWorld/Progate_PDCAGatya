import { useEffect, useState } from 'react'
import { Fit, Layout, useRive, useStateMachineInput } from '@rive-app/react-canvas'

type RiveAnimationProps = {
  /** public/配下の.rivへのURL (例: '/characters/ninjawanko.riv')。 */
  src: string
  /** 描画するArtboard名。省略時は既定Artboard。 */
  artboard?: string
  /** 再生するState Machine名。省略時はState Machineを動かさない。 */
  stateMachine?: string
  /** タップ時に発火させるtrigger入力名。stateMachine指定時のみ有効。 */
  tapTrigger?: string
  /** 読み込み中・失敗時・reduced-motion時に代わりに出す静止画。 */
  fallbackSrc: string
  /** canvasはalt属性を持たないため、ラッパーのaria-labelとして使う。 */
  alt: string
  className?: string
}

// prefers-reduced-motion: reduce の間はループアニメーションを再生せず静止画を出す
// (Homeに常時表示されるidleループのため)。
function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setPrefersReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return prefersReduced
}

// .rivを汎用的に埋め込むための共通コンポーネント。
// Rive本体(wasm)と.rivはネットワーク越しに非同期で読み込まれるため、
// 準備できるまで・失敗時・オフライン時はfallbackSrcの静止画を重ねて出す。
// (canvasはマウントされていないと読み込みが始まらないため、早期returnはしない)
export function RiveAnimation({
  src,
  artboard,
  stateMachine,
  tapTrigger,
  fallbackSrc,
  alt,
  className,
}: RiveAnimationProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [hasFailed, setHasFailed] = useState(false)
  const { RiveComponent, rive } = useRive({
    src,
    artboard,
    stateMachines: stateMachine,
    autoplay: true,
    layout: new Layout({ fit: Fit.Cover }),
    onLoadError: () => setHasFailed(true),
  })
  const trigger = useStateMachineInput(rive, stateMachine, tapTrigger)
  const showFallback = rive === null || hasFailed || prefersReducedMotion

  if (prefersReducedMotion || hasFailed) {
    return <img alt={alt} className={`object-contain ${className ?? ''}`} src={fallbackSrc} />
  }

  return (
    <div aria-label={alt} className={`relative ${className ?? ''}`} role="img">
      <RiveComponent
        onClick={trigger ? () => trigger.fire() : undefined}
        style={{ width: '100%', height: '100%' }}
      />
      {showFallback ? (
        <img alt="" aria-hidden="true" className="absolute inset-0 size-full object-contain" src={fallbackSrc} />
      ) : null}
    </div>
  )
}
