import { ConvexError } from 'convex/values'
import { describe, expect, it } from 'vitest'
import { ERROR_CODES } from './errors'
import { assertValidPdcaTransition, isValidPdcaTransition } from './pdca'

// submitDoResult は doing → checking のみを受理する。
describe('submitDoResult status guard', () => {
  it('accepts doing -> checking (AC-PDCA-003)', () => {
    expect(isValidPdcaTransition('doing', 'checking')).toBe(true)
  })

  it.each(['checking', 'acting', 'completed', 'cancelled'] as const)(
    'rejects %s -> checking',
    (from) => {
      try {
        assertValidPdcaTransition(from, 'checking')
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
