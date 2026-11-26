import type { PreparedCreate } from './config'
import type { PreSendDeps } from './pre-send'
import type { CreateLimits } from '@/contracts/create-types'

import { parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { MOCK_DEFAULT_CONFIG } from '@/contracts/fixtures/create-fixture'
import { bnbWei } from '@/lib/units'

import { CREATE_GAS_RESERVE, preSendChecks } from './pre-send'

const TOKEN = '0xcFC33677f4e3f9fAADD6e853553D43e8d1627777'

const PREPARED: PreparedCreate = {
  config: MOCK_DEFAULT_CONFIG,
  encoded: '0x01',
  fee: bnbWei(parseEther('0.005')),
  token: TOKEN,
}

const LIMITS: CreateLimits = {
  duration: { min: 60, max: 604_800 },
  acceptWindow: { min: 60, max: 86_400 },
  captainVestDuration: { min: 86_400, max: 7_776_000 },
  maxBonusShareBps: { min: 5000, max: 10_000 },
  captainAllocBps: { min: 0, max: 500 },
  captainShareBps: { min: 0, max: 5000 },
  minRaiseFloor: bnbWei(parseEther('2')),
  creationFloorAvailable: true,
}

const FRESH_FEE = bnbWei(parseEther('0.006'))

const harness = (patch: Partial<PreSendDeps> = {}) => {
  const calls: string[] = []
  const deps: PreSendDeps = {
    readLimits: () => {
      calls.push('limits')
      return Promise.resolve(LIMITS)
    },
    predictToken: () => {
      calls.push('predict')
      return Promise.resolve(TOKEN)
    },
    validateConfig: () => {
      calls.push('validate')
      return Promise.resolve({ ok: true })
    },
    readFee: () => {
      calls.push('fee')
      return Promise.resolve(FRESH_FEE)
    },
    readBalance: () => {
      calls.push('balance')
      return Promise.resolve(bnbWei(parseEther('1')))
    },
    ...patch,
  }
  return { calls, deps }
}

describe('preSendChecks', () => {
  it('runs the checks in order and sends the fresh fee', async () => {
    const { calls, deps } = harness()
    await expect(preSendChecks(PREPARED, deps)).resolves.toEqual({ ok: true, fee: FRESH_FEE })
    expect(calls).toEqual(['limits', 'predict', 'validate', 'fee', 'balance'])
  })

  it('stops first when the floor is unavailable', async () => {
    const { calls, deps } = harness({
      readLimits: () => Promise.resolve({ ...LIMITS, creationFloorAvailable: false }),
    })
    await expect(preSendChecks(PREPARED, deps)).resolves.toEqual({
      ok: false,
      kind: 'unavailable',
    })
    expect(calls).toEqual([])
  })

  it('stops when the factory predicts another address', async () => {
    const { calls, deps } = harness({
      predictToken: () => Promise.resolve('0xcFC33677f4e3f9fAADD6e853553D43e8d1627778'),
    })
    await expect(preSendChecks(PREPARED, deps)).resolves.toEqual({ ok: false, kind: 'salt' })
    expect(calls).toEqual(['limits'])
  })

  it('stops when the factory rejects the settings', async () => {
    const { calls, deps } = harness({
      validateConfig: () => Promise.resolve({ ok: false, reason: 'MinRaiseBelowCreationFloor' }),
    })
    await expect(preSendChecks(PREPARED, deps)).resolves.toEqual({
      ok: false,
      kind: 'reason',
      reason: 'MinRaiseBelowCreationFloor',
      limits: LIMITS,
    })
    expect(calls).toEqual(['limits', 'predict'])
  })

  it('needs the fee plus the gas reserve in the wallet', async () => {
    const needed = bnbWei(FRESH_FEE + CREATE_GAS_RESERVE)
    const short = harness({ readBalance: () => Promise.resolve(bnbWei(needed - 1n)) })
    await expect(preSendChecks(PREPARED, short.deps)).resolves.toEqual({
      ok: false,
      kind: 'balance',
      needed,
    })
    const exact = harness({ readBalance: () => Promise.resolve(needed) })
    await expect(preSendChecks(PREPARED, exact.deps)).resolves.toEqual({
      ok: true,
      fee: FRESH_FEE,
    })
  })
})
