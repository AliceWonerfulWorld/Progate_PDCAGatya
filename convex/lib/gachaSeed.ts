import { CHARACTER_SEED_DATA } from './characterSeed'
import type { GachaRates } from './gacha'

const ALL_CHARACTER_NAMES = CHARACTER_SEED_DATA.map((character) => character.name)

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export interface GachaSeedEntry {
  key: string
  name: string
  description?: string
  rates: GachaRates
  // 未指定 = 全キャラが対象(恒常ガチャ)。指定時はcharacterSeed.tsのnameと
  // 一致している必要があり、一致しない名前があるとseedGachasが例外を投げる。
  characterNames?: readonly string[]
  // 未指定 = 常設。指定時は「seedGachasで最初に投入された時刻」から
  // durationMsだけ有効になる(=施策コード投入のタイミングが開始時刻になる)。
  durationMs?: number
  // ガチャ選択画面のサムネイル画像(未指定可)。public/gacha/配下のパスを想定。
  imagePath?: string
  sortOrder: number
  isActive: boolean
}

// キャラクター(convex/lib/characterSeed.ts)と同じ方式で管理する。
// 排出率・対象キャラ・開催期間はここでコード管理し、レビューを経てから
// DBへ同期する(npx convex run gachas:seedGachas)。
export const GACHA_SEED_DATA: readonly GachaSeedEntry[] = [
  {
    key: 'standard',
    name: '恒常ガチャ',
    description: 'いつでも回せる通常のガチャ。',
    rates: { R: 0.7, SR: 0.25, SSR: 0.05 },
    sortOrder: 1,
    isActive: true,
  },
  {
    key: 'progate',
    name: 'Progateガチャ',
    description: 'Progateコラボの期間限定ガチャ。',
    rates: { R: 0.7, SR: 0.25, SSR: 0.05 },
    characterNames: ALL_CHARACTER_NAMES,
    durationMs: SEVEN_DAYS_MS,
    imagePath: '/gacha/progate.svg',
    sortOrder: 2,
    isActive: true,
  },
] as const

export function selectUnseededGachas(
  existingKeys: ReadonlySet<string>,
  seedData: readonly GachaSeedEntry[] = GACHA_SEED_DATA,
): GachaSeedEntry[] {
  return seedData.filter((gacha) => !existingKeys.has(gacha.key))
}
