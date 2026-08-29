import { describe, expect, it } from 'vitest'
import type { CollectionEntry } from '../../../convex/characters'
import { normalizeCollectionEntries } from './collectionData'

describe('normalizeCollectionEntries', () => {
  it('treats a legacy collection entry without eventNames as having no event labels', () => {
    const legacyEntry = {
      character: { _id: 'character-id' },
      owned: false,
      fragmentCount: 0,
      duplicateCount: 0,
      isPartner: false,
    } as unknown as CollectionEntry

    expect(normalizeCollectionEntries([legacyEntry])[0].eventNames).toEqual([])
  })
})
