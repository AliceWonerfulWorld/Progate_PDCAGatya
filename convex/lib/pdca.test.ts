import { describe, expect, it } from 'vitest'
import { ConvexError } from 'convex/values'
import { assertValidPdcaTransition, isValidPdcaTransition, type PdcaStatus } from './pdca'
import { ERROR_CODES } from './errors'

const ALL_STATUSES: PdcaStatus[] = ['doing', 'checking', 'acting', 'completed', 'cancelled']

describe('isValidPdcaTransition', () => {
  it.each([
    ['doing', 'checking'],
    ['checking', 'acting'],
    ['acting', 'completed'],
    ['doing', 'cancelled'],
    ['checking', 'cancelled'],
    ['acting', 'cancelled'],
  ] as const)('allows %s -> %s (AC-PDCA-010)', (from, to) => {
    expect(isValidPdcaTransition(from, to)).toBe(true)
  })

  it.each([
    ['doing', 'acting'],
    ['doing', 'completed'],
    ['checking', 'completed'],
    ['completed', 'doing'],
    ['cancelled', 'completed'],
  ] as const)('rejects %s -> %s (AC-PDCA-011)', (from, to) => {
    expect(isValidPdcaTransition(from, to)).toBe(false)
  })

  it('rejects any transition out of a terminal state', () => {
    for (const terminal of ['completed', 'cancelled'] as const) {
      for (const to of ALL_STATUSES) {
        expect(isValidPdcaTransition(terminal, to)).toBe(false)
      }
    }
  })

  it('rejects a status transitioning to itself', () => {
    for (const status of ALL_STATUSES) {
      expect(isValidPdcaTransition(status, status)).toBe(false)
    }
  })
})

describe('assertValidPdcaTransition', () => {
  it('does not throw for an allowed transition', () => {
    expect(() => assertValidPdcaTransition('doing', 'checking')).not.toThrow()
  })

  it('throws PDCA_INVALID_STATUS for a forbidden transition', () => {
    try {
      assertValidPdcaTransition('completed', 'doing')
      throw new Error('expected assertValidPdcaTransition to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(ConvexError)
      expect((error as ConvexError<{ code: string }>).data.code).toBe(
        ERROR_CODES.PDCA_INVALID_STATUS,
      )
    }
  })
})
