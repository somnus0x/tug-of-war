import type { GateRequest } from './types'

import { parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { bnbWei } from '@/lib/units'

import { gatePlan } from './gate-plan'

const base: GateRequest = {
  launcher: '0x1111111111111111111111111111111111111111',
  account: '0x2222222222222222222222222222222222222222',
  phase: 'buyIn',
  draft: { team: 'blue', amount: bnbWei(parseEther('0.1')) },
}

describe('gatePlan', () => {
  it('reads the pull gates during buy-in', () => {
    expect(gatePlan(base)).toEqual({
      gates: ['contribute', 'scheduleAutoLaunch'],
      preview: true,
      autoLaunchQuote: true,
    })
  })

  it('skips wallet gates without an account', () => {
    expect(gatePlan({ ...base, account: undefined }).gates).toEqual(['scheduleAutoLaunch'])
    expect(gatePlan({ ...base, account: undefined, phase: 'launched' }).gates).toEqual([])
  })

  it('skips the preview without a team or an amount', () => {
    expect(gatePlan({ ...base, draft: { team: 'none', amount: bnbWei(1n) } }).preview).toBe(false)
    expect(gatePlan({ ...base, draft: { team: 'red', amount: bnbWei(0n) } }).preview).toBe(false)
  })

  it('follows the phase', () => {
    expect(gatePlan({ ...base, phase: 'awaitingCaptains' }).gates).toEqual([
      'depositCaptain',
      'cancel',
    ])
    expect(gatePlan({ ...base, phase: 'awaitingLaunch' }).gates).toEqual(['launch', 'refund'])
    expect(gatePlan({ ...base, phase: 'refunding' }).gates).toEqual(['refund'])
    expect(gatePlan({ ...base, phase: 'launched' }).gates).toEqual(['claim', 'claimCaptain'])
    expect(gatePlan({ ...base, phase: 'cancelled' }).gates).toEqual([])
  })
})
