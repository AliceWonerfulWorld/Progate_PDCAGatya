import { internalMutation } from './_generated/server'
import { CHARACTER_SEED_DATA, selectUnseededCharacters } from './lib/characterSeed'

// npx convex run characters:seedCharacters で実行する。
// 既存 name と重複する Character は再作成しない（再実行してもレコードが増えない）。
export const seedCharacters = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('characters').collect()
    const existingNames = new Set(existing.map((character) => character.name))
    const toInsert = selectUnseededCharacters(existingNames)

    const now = Date.now()
    for (const character of toInsert) {
      await ctx.db.insert('characters', {
        ...character,
        createdAt: now,
        updatedAt: now,
      })
    }

    return {
      inserted: toInsert.length,
      skipped: CHARACTER_SEED_DATA.length - toInsert.length,
    }
  },
})
