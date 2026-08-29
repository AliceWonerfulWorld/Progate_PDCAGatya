import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Id } from '../../convex/_generated/dataModel'
import { clearGuestState, readGuestState, setGuestGachaState, setGuestGoal, setGuestPdcaCycle } from './guestStore'

const TEST_CHARACTER_ID = 'char-1' as Id<'characters'>

class MemoryStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
}

vi.stubGlobal('localStorage', new MemoryStorage())

beforeEach(() => {
  localStorage.clear()
})

describe('readGuestState', () => {
  it('AC-GUEST-003: creates a fresh session with a unique guestSessionId', () => {
    const first = readGuestState()
    localStorage.clear()
    const second = readGuestState()

    expect(first.guestSessionId).toEqual(expect.any(String))
    expect(first.guestSessionId).not.toBe(second.guestSessionId)
  })

  it('AC-GUEST-002: persists across repeated reads (simulated reload)', () => {
    const first = readGuestState()
    const second = readGuestState()

    expect(second.guestSessionId).toBe(first.guestSessionId)
  })

  it('starts with an empty gacha state and no goal/cycle', () => {
    const state = readGuestState()
    expect(state.goal).toBeUndefined()
    expect(state.cycle).toBeUndefined()
    expect(state.gacha).toEqual({ availableDraws: 0, firstResult: null })
  })

  it('falls back to a fresh session when stored JSON is corrupted', () => {
    localStorage.setItem('pdca-gacha:guest-state', '{not valid json')
    const state = readGuestState()
    expect(state.guestSessionId).toEqual(expect.any(String))
    expect(state.gacha.availableDraws).toBe(0)
  })
})

describe('setGuestGoal / setGuestPdcaCycle / setGuestGachaState', () => {
  it('AC-GUEST-002: persists a Goal and survives a re-read (reload)', () => {
    setGuestGoal({ name: '英語学習' })
    expect(readGuestState().goal).toEqual({ name: '英語学習' })
  })

  it('persists a PDCA cycle and can clear it back to undefined', () => {
    setGuestPdcaCycle({ planText: '英単語を5個復習する', status: 'doing', startedAt: 1000 })
    expect(readGuestState().cycle).toMatchObject({ planText: '英単語を5個復習する', status: 'doing' })

    setGuestPdcaCycle(undefined)
    expect(readGuestState().cycle).toBeUndefined()
  })

  it('persists Gacha state', () => {
    setGuestGachaState({
      availableDraws: 1,
      firstResult: { characterId: TEST_CHARACTER_ID, characterName: 'テスト', rarity: 'SR' },
    })
    expect(readGuestState().gacha).toEqual({
      availableDraws: 1,
      firstResult: { characterId: TEST_CHARACTER_ID, characterName: 'テスト', rarity: 'SR' },
    })
  })

  it('keeps the same guestSessionId across independent updates', () => {
    const sessionId = readGuestState().guestSessionId
    setGuestGoal({ name: 'Goal' })
    setGuestPdcaCycle({ planText: 'PLAN', status: 'doing', startedAt: 1 })
    setGuestGachaState({ availableDraws: 2, firstResult: null })

    expect(readGuestState().guestSessionId).toBe(sessionId)
  })
})

describe('clearGuestState', () => {
  it('removes stored data so the next read starts a brand new session', () => {
    const before = readGuestState()
    setGuestGoal({ name: '英語学習' })

    clearGuestState()

    const after = readGuestState()
    expect(after.guestSessionId).not.toBe(before.guestSessionId)
    expect(after.goal).toBeUndefined()
  })
})
