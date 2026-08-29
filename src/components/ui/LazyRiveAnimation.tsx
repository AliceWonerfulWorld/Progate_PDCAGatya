import { lazy, Suspense, type ComponentProps } from 'react'
import type { RiveAnimation } from './RiveAnimation'

const RiveAnimationComponent = lazy(() => import('./RiveAnimation').then((module) => ({ default: module.RiveAnimation })))

type LazyRiveAnimationProps = ComponentProps<typeof RiveAnimation>

// Riveは描画用の依存が大きいため、ホーム初期表示の必須リソースにはしない。
// 読み込み中も静止画を出して、相棒・マスコットの表示自体は待たせない。
export function LazyRiveAnimation({ alt, className, fallbackSrc, ...props }: LazyRiveAnimationProps) {
  return (
    <Suspense fallback={<img alt={alt} className={className} src={fallbackSrc} />}>
      <RiveAnimationComponent alt={alt} className={className} fallbackSrc={fallbackSrc} {...props} />
    </Suspense>
  )
}
