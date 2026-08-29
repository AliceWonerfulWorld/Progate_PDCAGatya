import { ConvexError } from 'convex/values'
import { describe, expect, it } from 'vitest'
import { recommendActType } from './act'
import { INPUT_LIMITS } from './constants'
import { ERROR_CODES } from './errors'
import { validateNextPlanCandidate } from '../pdca'

describe('recommendActType', () => {
  it('recommends lighter when the load was too heavy', () => {
    expect(recommendActType('tooHeavy', 'completed')).toBe('lighter')
    expect(recommendActType('slightlyHeavy', 'completed')).toBe('lighter')
  })

  it('recommends changeApproach when nothing was done at a manageable load', () => {
    expect(recommendActType('justRight', 'notCompleted')).toBe('changeApproach')
  })

  it('recommends heavier when it felt easy', () => {
    expect(recommendActType('easy', 'completed')).toBe('heavier')
  })

  it('recommends same when the load was just right', () => {
    expect(recommendActType('justRight', 'completed')).toBe('same')
    expect(recommendActType('justRight', 'partial')).toBe('same')
  })

  it('prefers lighter over changeApproach when the load was too heavy', () => {
    expect(recommendActType('tooHeavy', 'notCompleted')).toBe('lighter')
  })
})

describe('validateNextPlanCandidate', () => {
  it('treats an absent or blank candidate as unset', () => {
    expect(validateNextPlanCandidate(undefined)).toBeUndefined()
    expect(validateNextPlanCandidate('   ')).toBeUndefined()
  })

  it('trims a candidate', () => {
    expect(validateNextPlanCandidate(' 英単語を3個復習する ')).toBe('英単語を3個復習する')
  })

  it('accepts a candidate at the server-side limit', () => {
    const candidate = 'あ'.repeat(INPUT_LIMITS.nextPlanCandidate)
    expect(validateNextPlanCandidate(candidate)).toBe(candidate)
  })

  it('rejects a candidate over the server-side limit (AC-PDCA-009)', () => {
    try {
      validateNextPlanCandidate('a'.repeat(INPUT_LIMITS.nextPlanCandidate + 1))
      throw new Error('expected a ConvexError')
    } catch (error) {
      expect(error).toBeInstanceOf(ConvexError)
      expect((error as ConvexError<{ code: string }>).data.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    }
  })
})
