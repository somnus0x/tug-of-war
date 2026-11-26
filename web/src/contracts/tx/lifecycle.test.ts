import type { TxErrorInfo } from './classify-error'
import type { TxEvent, TxState } from './lifecycle'
import type { Hash } from 'viem'

import { describe, expect, it } from 'vitest'

import { IDLE, isBusy, txReducer } from './lifecycle'

type State = TxState<string>

const HASH_A: Hash = `0x${'a'.repeat(64)}`
const HASH_B: Hash = `0x${'b'.repeat(64)}`
const ERROR: TxErrorInfo = { kind: 'contract', name: 'TeamLocked', tone: 'error' }

const SIMULATING: State = { stage: 'simulating' }
const WALLET: State = { stage: 'wallet' }
const PENDING: State = { stage: 'pending', hash: HASH_A, checking: false }
const SUCCESS: State = { stage: 'success', hash: HASH_A, outcome: 'done' }
const FAILED: State = { stage: 'failed', error: ERROR, hash: undefined }

const step = (state: State, event: TxEvent<string>): State => txReducer(state, event)

describe('txReducer', () => {
  it('walks idle → simulating → wallet → pending → success', () => {
    let state: State = IDLE
    state = step(state, { type: 'start' })
    expect(state).toEqual(SIMULATING)
    state = step(state, { type: 'simulated' })
    expect(state).toEqual(WALLET)
    state = step(state, { type: 'submitted', hash: HASH_A })
    expect(state).toEqual(PENDING)
    state = step(state, { type: 'mined', outcome: 'done' })
    expect(state).toEqual(SUCCESS)
  })

  it.each([
    ['simulating', SIMULATING],
    ['wallet', WALLET],
  ])('fails from %s without a hash', (_name, state) => {
    expect(step(state, { type: 'failed', error: ERROR })).toEqual(FAILED)
  })

  it('fails from pending and keeps the hash', () => {
    expect(step(PENDING, { type: 'failed', error: ERROR })).toEqual({
      stage: 'failed',
      error: ERROR,
      hash: HASH_A,
    })
  })

  it('starts again from success, failed and idle', () => {
    for (const state of [IDLE, SUCCESS, FAILED]) {
      expect(step(state, { type: 'start' })).toEqual(SIMULATING)
    }
  })

  it('ignores a second start while busy', () => {
    for (const state of [SIMULATING, WALLET, PENDING]) {
      expect(step(state, { type: 'start' })).toBe(state)
    }
  })

  it('ignores events that do not belong to the stage', () => {
    expect(step(IDLE, { type: 'simulated' })).toBe(IDLE)
    expect(step(SIMULATING, { type: 'submitted', hash: HASH_A })).toBe(SIMULATING)
    expect(step(WALLET, { type: 'mined', outcome: 'x' })).toBe(WALLET)
    expect(step(IDLE, { type: 'failed', error: ERROR })).toBe(IDLE)
    expect(step(IDLE, { type: 'receiptUnknown' })).toBe(IDLE)
  })

  it('keeps waiting on the new hash after a speed-up', () => {
    expect(step(PENDING, { type: 'replaced', hash: HASH_B, reason: 'repriced' })).toEqual({
      stage: 'pending',
      hash: HASH_B,
      checking: false,
    })
    expect(step(PENDING, { type: 'replaced', hash: HASH_B, reason: 'replaced' })).toEqual({
      stage: 'pending',
      hash: HASH_B,
      checking: false,
    })
  })

  it('returns to idle when the transaction is cancelled', () => {
    expect(step(PENDING, { type: 'replaced', hash: HASH_B, reason: 'cancelled' })).toEqual(IDLE)
  })

  it('shows a checking state when the receipt cannot be read, then clears it', () => {
    const checking = step(PENDING, { type: 'receiptUnknown' })
    expect(checking).toEqual({ stage: 'pending', hash: HASH_A, checking: true })
    expect(isBusy(checking)).toBe(true)
    expect(step(checking, { type: 'receiptFound' })).toEqual(PENDING)
    expect(step(checking, { type: 'mined', outcome: 'done' })).toEqual(SUCCESS)
  })

  it('never goes back to the wallet from checking', () => {
    const checking = step(PENDING, { type: 'receiptUnknown' })
    expect(step(checking, { type: 'simulated' })).toBe(checking)
    expect(step(checking, { type: 'start' })).toBe(checking)
  })

  it('drops the busy state when the account or chain changes', () => {
    for (const state of [SIMULATING, WALLET, PENDING]) {
      expect(step(state, { type: 'contextChanged' })).toEqual(IDLE)
    }
    expect(step(SUCCESS, { type: 'contextChanged' })).toBe(SUCCESS)
  })

  it('resumes a stored transaction from a settled state only', () => {
    expect(step(IDLE, { type: 'resume', hash: HASH_A })).toEqual(PENDING)
    expect(step(WALLET, { type: 'resume', hash: HASH_A })).toBe(WALLET)
  })

  it('resets to idle', () => {
    expect(step(FAILED, { type: 'reset' })).toEqual(IDLE)
  })
})
