import type { PreparedCreate } from './config'
import type { CreateLimits } from '@/contracts/create-types'

import { parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { MOCK_DEFAULT_CONFIG } from '@/contracts/fixtures/create-fixture'
import { bnbWei } from '@/lib/units'

import { INITIAL_FLOW, checkPassed, checkRejected, checkStarted, keyedFor } from './flow-state'
import { cidAfterFileChange } from './form-values'
import { reasonProblem } from './reason-field'

const LIMITS: CreateLimits = {
  duration: { min: 60, max: 604_800 },
  acceptWindow: { min: 60, max: 86_400 },
  captainVestDuration: { min: 86_400, max: 7_776_000 },
  maxBonusShareBps: { min: 5000, max: 10_000 },
  captainAllocBps: { min: 0, max: 500 },
  captainShareBps: { min: 0, max: 5000 },
  minRaiseFloor: bnbWei(parseEther('2.3456')),
  creationFloorAvailable: true,
}

const READY: PreparedCreate = {
  config: MOCK_DEFAULT_CONFIG,
  encoded: '0x01',
  fee: bnbWei(parseEther('0.005')),
  token: '0x9c3b5e7a1d2f4c6b8a0e9d7c5b3a1f2e4d6c7777',
}

describe('flow state', () => {
  it('clears a factory field error when a retry with the same inputs passes', () => {
    const rejected = checkRejected(
      checkStarted(INITIAL_FLOW),
      'same',
      reasonProblem('MinRaiseBelowCreationFloor', LIMITS),
    )
    expect(keyedFor(rejected.fieldProblem, 'same')).toEqual({
      field: 'minRaise',
      text: 'Below Flap’s liquidity floor (2.3456 BNB right now).',
    })
    const retrying = checkStarted(rejected)
    expect(retrying.fieldProblem).toBeNull()
    const passed = checkPassed(retrying, 'same', READY)
    expect(passed.stage).toEqual({ kind: 'ready' })
    expect(keyedFor(passed.fieldProblem, 'same')).toBeNull()
    expect(keyedFor(passed.prepared, 'same')).toBe(READY)
  })

  it('puts form-level reasons in the problem and clears it on success', () => {
    const rejected = checkRejected(INITIAL_FLOW, 'k', reasonProblem('InvalidSalt', LIMITS))
    expect(rejected.problem?.title).toBe('The coin address search failed. Try again.')
    expect(checkPassed(rejected, 'k', READY).problem).toBeNull()
  })

  it('hides keyed values once the inputs move on', () => {
    expect(keyedFor({ key: 'a', value: 1 }, 'b')).toBeNull()
    expect(keyedFor({ key: 'a', value: 1 }, null)).toBeNull()
  })
})

describe('cidAfterFileChange', () => {
  it('clears a CID that came from an upload when the file changes', () => {
    expect(cidAfterFileChange('QmA', 'QmA')).toBe('')
    expect(cidAfterFileChange(' QmA ', 'QmA')).toBe('')
  })

  it('keeps a CID the creator pasted', () => {
    expect(cidAfterFileChange('QmPasted', 'QmA')).toBe('QmPasted')
    expect(cidAfterFileChange('QmPasted', null)).toBe('QmPasted')
  })
})
