import { v } from 'convex/values'
import { internalMutation, query } from './_generated/server'
import { GACHA_SEED_DATA, selectUnseededGachas } from './lib/gachaSeed'

// npx convex run gachas:seedGachas で実行する。
// 既存 key と重複する Gacha は再作成しない（再実行してもレコードが増えない）。
export const seedGachas = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('gachas').collect()
    const existingKeys = new Set(existing.map((gacha) => gacha.key))
    const toInsert = selectUnseededGachas(existingKeys)

    const now = Date.now()
    for (const gacha of toInsert) {
      await ctx.db.insert('gachas', {
        ...gacha,
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
