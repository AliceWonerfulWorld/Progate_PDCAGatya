import { ConvexError } from 'convex/values'
import { DUPLICATE_FRAGMENT_REWARDS, type CharacterRarity } from './constants'
import { ERROR_CODES } from './errors'

export interface GachaRates {
  R: number
  SR: number
  SSR: number
}

// randomValue must be a uniform value in [0, 1), e.g. Math.random().
// rates is read from the gachas table (convex/gachas.ts) at call time, not a
// module-level constant, so that排出率 can change without a code deploy.
// 0.00 <= x < rates.R -> R, rates.R <= x < rates.R+rates.SR -> SR, else -> SSR
export function rollRarity(randomValue: number, rates: GachaRates): CharacterRarity {
  if (randomValue < rates.R) return 'R'
  if (randomValue < rates.R + rates.SR) return 'SR'
  return 'SSR'
}

export interface CharacterCandidate {
  rarity: CharacterRarity
  isActive: boolean
  // 同じrarity内での抽選重み。省略/undefinedは1として扱う(=均等)。
  weight?: number
}

// 同じrarity内は重み付き抽選(一般的なソシャゲのピックアップと同様)。
// 全キャラのweightが省略/1のときは、旧来の均等抽選と完全に同じ結果になる。
export function selectCharacterForRarity<T extends CharacterCandidate>(
  characters: readonly T[],
  rarity: CharacterRarity,
  randomValue: number,
): T {
  const candidates = characters.filter(
    (character) => character.rarity === rarity && character.isActive,
  )

  if (candidates.length === 0) {
    throw new ConvexError({
      code: ERROR_CODES.GACHA_NO_ACTIVE_CHARACTER,
      message: `No active character available for rarity ${rarity}`,
    })
  }

  const weights = candidates.map((character) => character.weight ?? 1)
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const target = randomValue * totalWeight

  let cumulative = 0
  for (let i = 0; i < candidates.length; i += 1) {
    cumulative += weights[i]
    if (target < cumulative) return candidates[i]
  }
  // 浮動小数点誤差でtargetがtotalWeight以上になった場合の保険。
  return candidates[candidates.length - 1]
}

export function getDuplicateFragmentReward(rarity: CharacterRarity): number {
  return DUPLICATE_FRAGMENT_REWARDS[rarity]
}
