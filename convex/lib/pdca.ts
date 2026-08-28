import { ConvexError } from 'convex/values'
import { ERROR_CODES } from './errors'

export type PdcaStatus = 'doing' | 'checking' | 'acting' | 'completed' | 'cancelled'

const ALLOWED_TRANSITIONS: Record<PdcaStatus, readonly PdcaStatus[]> = {
  doing: ['checking', 'cancelled'],
  checking: ['acting', 'cancelled'],
  acting: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

export function isValidPdcaTransition(from: PdcaStatus, to: PdcaStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export function assertValidPdcaTransition(from: PdcaStatus, to: PdcaStatus): void {
  if (!isValidPdcaTransition(from, to)) {
    throw new ConvexError({
      code: ERROR_CODES.PDCA_INVALID_STATUS,
      message: `Invalid PDCA transition: ${from} -> ${to}`,
    })
  }
}
