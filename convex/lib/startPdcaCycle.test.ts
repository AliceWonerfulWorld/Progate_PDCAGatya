import { ConvexError } from 'convex/values'
import { describe, expect, it } from 'vitest'
import { INPUT_LIMITS } from './constants'
import { ERROR_CODES } from './errors'
import { validatePlanText } from '../pdca'

describe('validatePlanText', () => {
  it('trims and accepts a PLAN (AC-PDCA-001)', () => {
    expect(validatePlanText(' 英単語を5個復習する ')).toBe('英単語を5個復習する')
  })

  it('accepts a PLAN at the server-side limit', () => {
    const planText = 'あ'.repeat(INPUT_LIMITS.planText)
    expect(validatePlanText(planText)).toBe(planText)
  })

  it.each(['', '   ', 'a'.repeat(INPUT_LIMITS.planText + 1)])(
    'rejects invalid PLAN text on the server',
    (planText) => {
      try {
        validatePlanText(planText)
        throw new Error('expected a ConvexError')
      } catch (error) {
        expect(error).toBeInstanceOf(ConvexError)
        expect((error as ConvexError<{ code: string }>).data.code).toBe(
          ERROR_CODES.VALIDATION_ERROR,
        )
      }
    },
  )
})
