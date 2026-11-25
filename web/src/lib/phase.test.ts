import { describe, expect, it } from 'vitest'

import {
  PHASE_AWAITING_CAPTAINS,
  PHASE_AWAITING_LAUNCH,
  PHASE_BUY_IN,
  PHASE_CANCELLED,
  PHASE_LAUNCHED,
  PHASE_REFUNDING,
  phaseFromId,
  phaseToId,
} from './phase'

describe('phase', () => {
  it('maps every contract id to its name', () => {
    expect(phaseFromId(PHASE_AWAITING_CAPTAINS)).toBe('awaitingCaptains')
    expect(phaseFromId(PHASE_BUY_IN)).toBe('buyIn')
    expect(phaseFromId(PHASE_AWAITING_LAUNCH)).toBe('awaitingLaunch')
    expect(phaseFromId(PHASE_REFUNDING)).toBe('refunding')
    expect(phaseFromId(PHASE_LAUNCHED)).toBe('launched')
    expect(phaseFromId(PHASE_CANCELLED)).toBe('cancelled')
  })

  it('round-trips ids 0 to 5', () => {
    for (const id of [0, 1, 2, 3, 4, 5]) {
      expect(phaseToId(phaseFromId(id))).toBe(id)
    }
  })

  it.each([6, -1, 0.5, Number.NaN, 255])('throws on unknown id %s', (id) => {
    expect(() => phaseFromId(id)).toThrow(RangeError)
  })
})
