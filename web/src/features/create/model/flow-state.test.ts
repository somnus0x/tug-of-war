import type { PreparedCreate } from './config'
import type { CreateLimits } from '@/contracts/create-types'

import { parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { MOCK_DEFAULT_CONFIG } from '@/contracts/fixtures/create-fixture'
import { bnbWei } from '@/lib/units'

import { hasBlockingErrors } from './create-button'
import {
  INITIAL_FLOW,
  checkFailed,
  checkPassed,
  checkRejected,
  checkStarted,
  judgedKey,
  keyedFor,
  recheckDue,
} from './flow-state'
import { cidAfterFileChange, typedCidDropsFile } from './form-values'
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

const at = (floor: string): CreateLimits => ({
  ...LIMITS,
  minRaiseFloor: bnbWei(parseEther(floor)),
})

describe('factory field error under changing limits', () => {
  const CONFIG_KEY = 'minRaise=3'

  it('lifts the block when the floor falls and lets a retry pass', () => {
    const rejected = checkRejected(
      checkStarted(INITIAL_FLOW),
      judgedKey(CONFIG_KEY, at('3.5')),
      reasonProblem('MinRaiseBelowCreationFloor', at('3.5')),
    )
    const live = judgedKey(CONFIG_KEY, at('2.5'))
    const visible = keyedFor(rejected.fieldProblem, live)
    expect(visible).toBeNull()
    expect(hasBlockingErrors({}, visible)).toBe(false)
    expect(recheckDue(live, judgedKey(CONFIG_KEY, at('3.5')))).toBe(true)
    const passed = checkPassed(checkStarted(rejected), CONFIG_KEY, READY)
    expect(passed.fieldProblem).toBeNull()
    expect(passed.stage).toEqual({ kind: 'ready' })
  })

  it('keeps the block while the floor stays where it was', () => {
    const judged = judgedKey(CONFIG_KEY, at('3.5'))
    const rejected = checkRejected(
      INITIAL_FLOW,
      judged,
      reasonProblem('MinRaiseBelowCreationFloor', at('3.5')),
    )
    const live = judgedKey(CONFIG_KEY, at('3.5'))
    expect(hasBlockingErrors({}, keyedFor(rejected.fieldProblem, live))).toBe(true)
    expect(recheckDue(live, judged)).toBe(false)
  })
})

describe('cidAfterFileChange', () => {
  it('clears a CID that came from an upload when the file changes', () => {
    expect(cidAfterFileChange('QmA', 'QmA')).toBe('')
    expect(cidAfterFileChange(' QmA ', 'QmA')).toBe('')
  })

  it('keeps a pasted CID when the file is removed', () => {
    expect(cidAfterFileChange('QmPasted', 'QmA')).toBe('QmPasted')
    expect(cidAfterFileChange('QmPasted', null)).toBe('QmPasted')
  })

  it('clears any CID, pasted or uploaded, when a new file is chosen', () => {
    const file = new File(['x'], 'coin.png')
    expect(cidAfterFileChange('QmPasted', null, file)).toBe('')
    expect(cidAfterFileChange('QmA', 'QmA', file)).toBe('')
  })
})

describe('ready only after a passing check', () => {
  it('drops the ready config when a recheck fails or is rejected', () => {
    const ready = checkPassed(INITIAL_FLOW, 'k', READY)
    expect(keyedFor(ready.prepared, 'k')).toBe(READY)
    expect(checkStarted(ready).prepared).toBeNull()
    expect(
      checkFailed(ready, { title: 'Could not reach the factory. Try again.' }).prepared,
    ).toBeNull()
    const unavailable = checkRejected(ready, 'k', reasonProblem('CreationFloorUnavailable', LIMITS))
    expect(unavailable.prepared).toBeNull()
    expect(unavailable.problem).not.toBeNull()
  })
})

describe('typedCidDropsFile', () => {
  it('drops the chosen file once a CID is typed or pasted', () => {
    expect(typedCidDropsFile('Qm')).toBe(true)
    expect(typedCidDropsFile('   ')).toBe(false)
    expect(typedCidDropsFile('')).toBe(false)
  })
})
