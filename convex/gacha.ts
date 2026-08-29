import { ConvexError } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { mutation } from './_generated/server'
import { requireCurrentUser } from './lib/auth'
import type { CharacterRarity } from './lib/constants'
import { ERROR_CODES } from './lib/errors'
import { getDuplicateFragmentReward, rollRarity, selectCharacterForRarity } from './lib/gacha'

export interface DrawGachaResult {
  characterId: Id<'characters'>
  characterName: string
  rarity: CharacterRarity
  imagePath: string
  defaultMessage: string | undefined
  wasDuplicate: boolean
  fragmentReward: number
  availableGachaDraws: number
  totalGachaDraws: number
  drawSequence: number
}

// docs/technical-design.md #23-31 (drawGacha Mutation / Flow / Gacha History)。
// 入力は{}のみ。rarity/characterId/fragmentRewardはFrontendから渡さず、
// すべてServer側で確定する(AGENTS.md #20 Gacha Authority, AC-GACHA-005)。
export const drawGacha = mutation({
  args: {},
  handler: async (ctx): Promise<DrawGachaResult> => {
    const currentUser = await requireCurrentUser(ctx)

    // AC-GACHA-004: 残数0は拒否し、他の状態を一切変更しない。
    if (currentUser.availableGachaDraws <= 0) {
      throw new ConvexError({ code: ERROR_CODES.GACHA_NO_DRAW_AVAILABLE })
    }

    const rarity = rollRarity(Math.random())
    const candidates = await ctx.db
      .query('characters')
      .withIndex('by_rarity', (q) => q.eq('rarity', rarity))
      .collect()
    // isActive=falseの候補はselectCharacterForRarity内で除外される(AC-GACHA-007)。
    // 候補が0件ならGACHA_NO_ACTIVE_CHARACTERで拒否され、DB更新は行われない。
    const character = selectCharacterForRarity(candidates, rarity, Math.random())

    const now = Date.now()
    const existingInventory = await ctx.db
      .query('inventories')
      .withIndex('by_user_character', (q) =>
        q.eq('userId', currentUser._id).eq('characterId', character._id),
      )
      .unique()

    const wasDuplicate = existingInventory !== null
    const fragmentReward = wasDuplicate ? getDuplicateFragmentReward(rarity) : 0

    if (existingInventory === null) {
      // AC-GACHA-008: 初入手。
      await ctx.db.insert('inventories', {
        userId: currentUser._id,
        characterId: character._id,
        fragmentCount: 0,
        duplicateCount: 0,
        obtainedAt: now,
        updatedAt: now,
      })
    } else {
      // AC-GACHA-009 / AC-GACHA-010: 新規レコードは作らず既存を更新する。
      await ctx.db.patch(existingInventory._id, {
        fragmentCount: existingInventory.fragmentCount + fragmentReward,
        duplicateCount: existingInventory.duplicateCount + 1,
        updatedAt: now,
      })
    }

    // AC-GACHA-012: 通算抽選番号は1から連番で増加する。
    const drawSequence = currentUser.totalGachaDraws + 1

    // AC-GACHA-011: 成功時は必ず1件のgachaHistoryを作成する。
    await ctx.db.insert('gachaHistory', {
      userId: currentUser._id,
      characterId: character._id,
      rarity,
      wasDuplicate,
      fragmentReward,
      gachaType: 'normal',
      drawSequence,
      drawnAt: now,
    })

    const availableGachaDraws = currentUser.availableGachaDraws - 1
    await ctx.db.patch(currentUser._id, {
      availableGachaDraws,
      totalGachaDraws: drawSequence,
      updatedAt: now,
    })

    return {
      characterId: character._id,
      characterName: character.name,
      rarity,
      imagePath: character.imagePath,
      defaultMessage: character.defaultMessage,
      wasDuplicate,
      fragmentReward,
      availableGachaDraws,
      totalGachaDraws: drawSequence,
      drawSequence,
    }
  },
})
