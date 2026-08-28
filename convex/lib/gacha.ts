import { ConvexError } from 'convex/values'
import { DUPLICATE_FRAGMENT_REWARDS, GACHA_RATES, type CharacterRarity } from './constants'
import { ERROR_CODES } from './errors'

// randomValue must be a uniform value in [0, 1), e.g. Math.random().
// 0.00 <= x < 0.70 -> R, 0.70 <= x < 0.95 -> SR, 0.95 <= x < 1.00 -> SSR
export function rollRarity(randomValue: number): CharacterRarity {
  if (randomValue < GACHA_RATES.R) return 'R'
  if (randomValue < GACHA_RATES.R + GACHA_RATES.SR) return 'SR'
  return 'SSR'
}

export interface CharacterCandidate {
  rarity: CharacterRarity
  isActive: boolean
}

// Even selection within the given rarity, no per-character weight in MVP.
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

  const index = Math.min(Math.floor(randomValue * candidates.length), candidates.length - 1)
  return candidates[index]
}

export function getDuplicateFragmentReward(rarity: CharacterRarity): number {
  return DUPLICATE_FRAGMENT_REWARDS[rarity]
}
