import type { GachaRates } from './gacha'

export interface GachaSeedEntry {
  key: string
  name: string
  description?: string
  rates: GachaRates
  sortOrder: number
  isActive: boolean
}

// キャラクター(convex/lib/characterSeed.ts)と同じ方式で管理する。
// 排出率はここでコード管理し、レビューを経てからDBへ同期する
// (npx convex run gachas:seedGachas)。DB上の値を直接書き換えることも
// できるが、正の値はこのファイルをSource of Truthとする。
export const GACHA_SEED_DATA: readonly GachaSeedEntry[] = [
  {
    key: 'standard',
    name: '恒常ガチャ',
    description: 'いつでも回せる通常のガチャ。',
    rates: { R: 0.7, SR: 0.25, SSR: 0.05 },
    sortOrder: 1,
    isActive: true,
  },
] as const

export function selectUnseededGachas(
  existingKeys: ReadonlySet<string>,
  seedData: readonly GachaSeedEntry[] = GACHA_SEED_DATA,
): GachaSeedEntry[] {
  return seedData.filter((gacha) => !existingKeys.has(gacha.key))
}
