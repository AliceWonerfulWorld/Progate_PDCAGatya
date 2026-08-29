import type { Doc, Id } from './_generated/dataModel'
import { internalMutation, query } from './_generated/server'
import { requireCurrentUser } from './lib/auth'
import { CHARACTER_SEED_DATA, selectUnseededCharacters } from './lib/characterSeed'
import type { CharacterRarity } from './lib/constants'

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

export interface CollectionEntry {
  character: Doc<'characters'>
  owned: boolean
  fragmentCount: number
  duplicateCount: number
  isPartner: boolean
}

// docs/ui-spec.md #22 (Collection画面) / AC-COLLECTION-001〜003。
// Character masterは15体固定のため、全件取得してInventoryと結合する。
// isActive=falseのCharacterも図鑑としては表示対象に含める。
export const listCollection = query({
  args: {},
  handler: async (ctx): Promise<CollectionEntry[]> => {
    const currentUser = await requireCurrentUser(ctx)
    const characters = await ctx.db.query('characters').collect()
    const inventories = await ctx.db
      .query('inventories')
      .withIndex('by_user', (q) => q.eq('userId', currentUser._id))
      .collect()
    const inventoryByCharacter = new Map<Id<'characters'>, Doc<'inventories'>>(
      inventories.map((inventory) => [inventory.characterId, inventory]),
    )

    // Array#toSorted() needs ES2023 lib, but this file is also typechecked via
    // tsconfig.app.json (ES2022) through convex/_generated/api.d.ts's import graph.
    const sortedCharacters = [...characters]
    // oxlint-disable-next-line no-array-sort -- already spread into a fresh array.
    sortedCharacters.sort((a, b) => a.sortOrder - b.sortOrder)

    return sortedCharacters.map((character) => {
      const inventory = inventoryByCharacter.get(character._id)
      return {
        character,
        owned: inventory !== undefined,
        fragmentCount: inventory?.fragmentCount ?? 0,
        duplicateCount: inventory?.duplicateCount ?? 0,
        isPartner: currentUser.partnerCharacterId === character._id,
      }
    })
  },
})

export interface GachaCharacterPreview {
  _id: Id<'characters'>
  name: string
  rarity: CharacterRarity
  imagePath: string
  description: string
  defaultMessage: string | undefined
  weight: number | undefined
}

// docs/tech-stack.md #8 / docs/user-flow.md #1: Guestは未ログインでも初回ガチャを
// 体験できる。この初回ガチャは Inventory へ何も書き込まないため認可不要であり、
// requireCurrentUser を呼ばない唯一の公開Query。個人情報を含まない
// Character masterの最小情報のみを返す。
export const listActiveForGuestGacha = query({
  args: {},
  handler: async (ctx): Promise<GachaCharacterPreview[]> => {
    const characters = await ctx.db.query('characters').collect()
    return characters
      .filter((character) => character.isActive)
      .map((character) => ({
        _id: character._id,
        name: character.name,
        rarity: character.rarity,
        imagePath: character.imagePath,
        description: character.description,
        defaultMessage: character.defaultMessage,
        weight: character.weight,
      }))
  },
})
