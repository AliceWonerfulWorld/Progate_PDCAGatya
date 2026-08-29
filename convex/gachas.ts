import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { internalMutation, query } from './_generated/server'
import type { QueryCtx } from './_generated/server'
import { requireCurrentUser } from './lib/auth'
import { GACHA_SEED_DATA, selectUnseededGachas } from './lib/gachaSeed'

async function resolveCharacterIds(
  ctx: QueryCtx,
  characterNames: readonly string[],
): Promise<Id<'characters'>[]> {
  const characters = await ctx.db.query('characters').collect()
  const idByName = new Map(characters.map((character) => [character.name, character._id]))

  return characterNames.map((name) => {
    const id = idByName.get(name)
    if (id === undefined) {
      throw new Error(`gachaSeed references unknown character name: ${name}`)
    }
    return id
  })
}

// npx convex run gachas:seedGachas で実行する(先に characters:seedCharacters を
// 実行しておくこと。characterNamesの解決にCharacter masterが必要なため)。
// 既存 key と重複する Gacha は再作成しない（再実行してもレコードが増えない）。
// durationMs指定のガチャは、このmutationで初めてそのkeyを投入した時刻が
// startAt(=開催開始)になる。
export const seedGachas = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('gachas').collect()
    const existingKeys = new Set(existing.map((gacha) => gacha.key))
    const toInsert = selectUnseededGachas(existingKeys)

    const now = Date.now()
    for (const gacha of toInsert) {
      const characterIds = gacha.characterNames
        ? await resolveCharacterIds(ctx, gacha.characterNames)
        : undefined

      await ctx.db.insert('gachas', {
        key: gacha.key,
        name: gacha.name,
        description: gacha.description,
        rates: gacha.rates,
        characterIds,
        imagePath: gacha.imagePath,
        isActive: gacha.isActive,
        sortOrder: gacha.sortOrder,
        startAt: gacha.durationMs !== undefined ? now : undefined,
        endAt: gacha.durationMs !== undefined ? now + gacha.durationMs : undefined,
        createdAt: now,
        updatedAt: now,
      })
    }

    return {
      inserted: toInsert.length,
      skipped: GACHA_SEED_DATA.length - toInsert.length,
    }
  },
})

// docs/user-flow.md #1.3: Guestの初回ガチャも、ログイン後に回す恒常ガチャと
// 同じ排出率で体験できるようにする。rates以外の内部フィールドは返さない、
// 認証不要の公開Query。
export const getActiveGachaRates = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const gacha = await ctx.db
      .query('gachas')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .unique()

    if (gacha === null || !gacha.isActive) return null
    return gacha.rates
  },
})

export interface GachaBannerInfo {
  key: string
  name: string
  description: string | undefined
  characterNames: string[]
  imagePath: string | undefined
  startAt: number | undefined
  endAt: number | undefined
}

// 選択式のガチャ一覧(バナー)。終了済み(endAt <= now)のガチャは含めない。
// imagePath未指定のガチャは、対象キャラの名前一覧で代替表現する(UI側)。
export const listActiveGachas = query({
  args: {},
  handler: async (ctx): Promise<GachaBannerInfo[]> => {
    await requireCurrentUser(ctx)
    const now = Date.now()

    const gachas = await ctx.db
      .query('gachas')
      .withIndex('by_active_sort_order', (q) => q.eq('isActive', true))
      .collect()
    const visible = gachas.filter((gacha) => gacha.endAt === undefined || gacha.endAt > now)

    const sortedGachas = [...visible]
    // oxlint-disable-next-line no-array-sort -- already spread into a fresh array.
    sortedGachas.sort((a, b) => a.sortOrder - b.sortOrder)

    const allCharacters = await ctx.db.query('characters').collect()
    const nameById = new Map(allCharacters.map((character) => [character._id, character.name]))

    return sortedGachas.map((gacha) => ({
      key: gacha.key,
      name: gacha.name,
      description: gacha.description,
      characterNames:
        gacha.characterIds === undefined
          ? allCharacters.filter((character) => character.isActive).map((character) => character.name)
          : gacha.characterIds.map((id) => nameById.get(id)).filter((name): name is string => name !== undefined),
      imagePath: gacha.imagePath,
      startAt: gacha.startAt,
      endAt: gacha.endAt,
    }))
  },
})
