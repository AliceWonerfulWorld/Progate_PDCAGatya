import { useEffect, useState } from 'react'
import { Fit, Layout, useRive, useStateMachineInput } from '@rive-app/react-canvas'

export type CheckAckTone = 'light' | 'quiet'

type CheckAckAnimationProps = {
  /** 発火のたびに変わる値。null の間は何も出さない。 */
  playKey: number | null
  tone: CheckAckTone
}

// CHECKの選択を受け取ったことを示す短い手応え(ui-spec 13.4)。
// 「保存できた」ではなく「選んだ」の確認なので、送信結果を待たずに再生する。
// Homeの相棒と違い常時表示ではないため、reduced-motionでは静止画も出さず
// 何も描かない(150msだけ静止画が明滅する方が体験として悪いため)。
const SRC = '/pdca/check-ack.riv'
const STATE_MACHINE = 'CheckAck'

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

export function CheckAckAnimation({ playKey, tone }: CheckAckAnimationProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const { RiveComponent, rive } = useRive({
    src: SRC,
    stateMachines: STATE_MACHINE,
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain }),
  })
  // トーンごとに別triggerを持つ。数値入力の条件分岐は.riv側で表現できないため。
  const playLight = useStateMachineInput(rive, STATE_MACHINE, 'playLight')
  const playQuiet = useStateMachineInput(rive, STATE_MACHINE, 'playQuiet')

  useEffect(() => {
    if (playKey === null || prefersReducedMotion) return
    const input = tone === 'light' ? playLight : playQuiet
    input?.fire()
  }, [playKey, tone, playLight, playQuiet, prefersReducedMotion])

  if (prefersReducedMotion) return null

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
      <RiveComponent style={{ width: 40, height: 40 }} />
    </div>
  )
}
