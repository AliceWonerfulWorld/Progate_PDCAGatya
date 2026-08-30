import '@google/model-viewer'
import { createElement, useEffect, useRef, useState, type CSSProperties } from 'react'

// docs/ui-spec.md #23 (Character Detail) の詳細画面でだけ 3D モデルを表示する。
// 一覧 / ガチャ演出 / 相棒表示は従来どおり 2D 画像 (imagePath) のまま。
//
// このファイルは CharacterDetailPage から React.lazy で読み込まれるため、
// @google/model-viewer の重いバンドルは「所持済み SSR の詳細を開いたとき」だけ
// ダウンロードされる。

interface Character3DViewerProps {
  modelPath: string
  // 3D の読み込み前 (poster) と失敗時に見せる 2D 画像。
  posterSrc: string
  name: string
  // 後ろに敷く「それっぽい」背景画像。無ければ単色にフォールバックする。
  backgroundSrc?: string
}

// backgroundSrc が無い / 読めないときの下地。SSR らしい淡いステージ風グラデーション。
// 色はデザイントークン経由 (AGENTS.md §55.1)。amber-50 は SSR の面色、
// slate-200 は淡い境界色に相当するため、それぞれ役割トークンへ対応させている。
const FRAME_CLASS =
  'relative mx-auto aspect-[4/5] size-full overflow-hidden rounded-2xl bg-gradient-to-b from-rarity-ssr-bg via-surface to-border-subtle'

export default function Character3DViewer({
  modelPath,
  posterSrc,
  name,
  backgroundSrc = '/characters/ssr-bg.webp',
}: Character3DViewerProps) {
  const viewerRef = useRef<HTMLElement | null>(null)
  const [modelFailed, setModelFailed] = useState(false)
  const [backgroundFailed, setBackgroundFailed] = useState(false)

  useEffect(() => {
    const element = viewerRef.current
    if (element === null) return undefined
    const handleError = () => setModelFailed(true)
    element.addEventListener('error', handleError)
    return () => element.removeEventListener('error', handleError)
  }, [])

  const background =
    backgroundSrc && !backgroundFailed ? (
      <img
        aria-hidden="true"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        onError={() => setBackgroundFailed(true)}
        src={backgroundSrc}
      />
    ) : null

  if (modelFailed) {
    return (
      <div className={FRAME_CLASS}>
        {background}
        <img
          alt={name}
          className="absolute inset-0 h-full w-full object-contain"
          src={posterSrc}
        />
      </div>
    )
  }

  return (
    <div className={FRAME_CLASS}>
      {background}
      {createElement('model-viewer', {
        ref: viewerRef,
        src: modelPath,
        poster: posterSrc,
        alt: name,
        // 左右ドラッグのみ許可し、中心から ±45deg にクランプする。
        // phi (上下角) は min/max を同じ値にして固定、ズーム・パンは無効。
        'camera-controls': true,
        'disable-zoom': true,
        'disable-pan': true,
        'interaction-prompt': 'none',
        'camera-orbit': '0deg 80deg auto',
        'min-camera-orbit': '-45deg 80deg auto',
        'max-camera-orbit': '45deg 80deg auto',
        // モデルが暗くならないよう内蔵の中立ライティングを使う。
        'environment-image': 'neutral',
        'shadow-intensity': '0.4',
        style: {
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'transparent',
          '--poster-color': 'transparent',
        } as CSSProperties,
      })}
    </div>
  )
}
