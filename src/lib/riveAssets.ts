// キャラクター名 -> Riveアニメーション設定のレジストリ。
// 新しい.rivを足すときは public/characters/ にファイルを置き、
// ここに1エントリ追加するだけでよい(Convexのschema/seedは変更不要。
// 静止画はConvexのimagePathをそのままフォールバックに使う)。
export type RiveAssetConfig = {
  src: string
  artboard?: string
  stateMachine?: string
  tapTrigger?: string
}

const RIVE_ASSETS: Record<string, RiveAssetConfig> = {
  にんじゃわんこ: {
    src: '/characters/ninjawanko.riv',
    artboard: 'Character',
    stateMachine: 'Character',
    tapTrigger: 'happy',
  },
}

export function getRiveAsset(characterName: string): RiveAssetConfig | undefined {
  return RIVE_ASSETS[characterName]
}
