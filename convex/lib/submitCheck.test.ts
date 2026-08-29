import { ConvexError } from 'convex/values'
import { describe, expect, it } from 'vitest'
import { INPUT_LIMITS } from './constants'
import { ERROR_CODES } from './errors'
import { assertValidPdcaTransition, isValidPdcaTransition } from './pdca'
import { validateCheckMemo } from '../pdca'

// submitCheck は checking → acting のみを受理する。
describe('submitCheck status guard', () => {
  it('accepts checking -> acting (AC-PDCA-006)', () => {
    expect(isValidPdcaTransition('checking', 'acting')).toBe(true)
  })

  it.each(['doing', 'acting', 'completed', 'cancelled'] as const)(
    'rejects %s -> acting',
    (from) => {
      try {
        assertValidPdcaTransition(from, 'acting')
        throw new Error('expected a ConvexError')
      } catch (error) {
        expect(error).toBeInstanceOf(ConvexError)
        expect((error as ConvexError<{ code: string }>).data.code).toBe(
          ERROR_CODES.PDCA_INVALID_STATUS,
        )
      }
    },
  )
})

describe('validateCheckMemo', () => {
  it('treats an absent or blank memo as unset (AC-PDCA-008)', () => {
    expect(validateCheckMemo(undefined)).toBeUndefined()
    expect(validateCheckMemo('   ')).toBeUndefined()
  })

  it('trims a memo', () => {
    expect(validateCheckMemo(' 疲れていた ')).toBe('疲れていた')
  })

  it('accepts a memo at the server-side limit', () => {
    const checkMemo = 'あ'.repeat(INPUT_LIMITS.checkMemo)
    expect(validateCheckMemo(checkMemo)).toBe(checkMemo)
  })

  it('rejects a memo over the server-side limit', () => {
    try {
      validateCheckMemo('a'.repeat(INPUT_LIMITS.checkMemo + 1))
      throw new Error('expected a ConvexError')
    } catch (error) {
      expect(error).toBeInstanceOf(ConvexError)
      expect((error as ConvexError<{ code: string }>).data.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    }
  })
})
