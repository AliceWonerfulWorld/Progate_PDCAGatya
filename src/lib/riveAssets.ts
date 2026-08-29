// キャラクター名 -> Riveアニメーション設定のレジストリ。
// 新しい.rivを足すときは public/characters/ に .riv と静止画を置き、
// ここに1エントリ追加するだけでよい(Convexのschema/seedは変更不要)。
export type RiveAssetConfig = {
  src: string
  artboard?: string
  stateMachine?: string
  tapTrigger?: string
  // .rivと同じ絵柄の静止画。読み込み中・失敗時・reduced-motion時に出す。
  // ConvexのimagePath(ドット絵)を使うと絵柄が切り替わって見えるため、
  // Riveのアートワークから書き出したものを対にして持たせる。
  fallbackSrc: string
}

const RIVE_ASSETS: Record<string, RiveAssetConfig> = {
  にんじゃわんこ: {
    src: '/characters/ninjawanko.riv',
    artboard: 'Character',
    stateMachine: 'Character',
    tapTrigger: 'happy',
    fallbackSrc: '/characters/ninjawanko.png',
  },
}

export function getRiveAsset(characterName: string): RiveAssetConfig | undefined {
  return RIVE_ASSETS[characterName]
}
