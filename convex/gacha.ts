import { ConvexError, v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
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
// gachaKey以外はFrontendから渡さず、すべてServer側で確定する
// (AGENTS.md #20 Gacha Authority, AC-GACHA-005)。gachaKey省略時は'standard'
// (恒常ガチャ)。
export const drawGacha = mutation({
  args: { gachaKey: v.optional(v.string()) },
  handler: async (ctx, args): Promise<DrawGachaResult> => {
    const currentUser = await requireCurrentUser(ctx)
    const gachaKey = args.gachaKey ?? 'standard'

    // AC-GACHA-004: 残数0は拒否し、他の状態を一切変更しない。
    if (currentUser.availableGachaDraws <= 0) {
      throw new ConvexError({ code: ERROR_CODES.GACHA_NO_DRAW_AVAILABLE })
    }

    // 排出率・対象キャラ・開催期間はgachasテーブル(convex/lib/gachaSeed.ts)から読む。
    // 未seed/非active/開催期間外の場合はDB更新を一切行わず拒否する。
    const gachaConfig = await ctx.db
      .query('gachas')
      .withIndex('by_key', (q) => q.eq('key', gachaKey))
      .unique()
    const now = Date.now()
    const isWithinWindow =
      (gachaConfig?.startAt === undefined || gachaConfig.startAt <= now) &&
      (gachaConfig?.endAt === undefined || gachaConfig.endAt > now)
    if (gachaConfig === null || !gachaConfig.isActive || !isWithinWindow) {
      throw new ConvexError({ code: ERROR_CODES.GACHA_NOT_CONFIGURED })
    }

    const rarity = rollRarity(Math.random(), gachaConfig.rates)
    const rarityCandidates = await ctx.db
      .query('characters')
      .withIndex('by_rarity', (q) => q.eq('rarity', rarity))
      .collect()
    // gachaConfig.characterIdsが指定されているガチャは、そのキャラのみを対象にする
    // (未指定 = 恒常ガチャのように全active Characterが対象)。
    const candidates: Doc<'characters'>[] =
      gachaConfig.characterIds === undefined
        ? rarityCandidates
        : rarityCandidates.filter((character) =>
            gachaConfig.characterIds?.includes(character._id),
          )
    // isActive=falseの候補はselectCharacterForRarity内で除外される(AC-GACHA-007)。
    // 候補が0件ならGACHA_NO_ACTIVE_CHARACTERで拒否され、DB更新は行われない。
    const character = selectCharacterForRarity(candidates, rarity, Math.random())

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
      gachaKey,
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
