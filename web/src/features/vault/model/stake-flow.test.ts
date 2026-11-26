import type { StakeFlow, StakeFlowEvent, StakeIntent, StakePlace } from './stake-flow'
import type { Address } from 'viem'

import { describe, expect, it } from 'vitest'

import { VAULT_COPY } from '@/copy/vault'
import { tokenWei } from '@/lib/units'

import {
  IDLE_FLOW,
  firstStep,
  intentOf,
  stakeFlowReducer,
  stakeNoteOf,
  stakeToChain,
} from './stake-flow'

const PLACE: StakePlace = {
  launcher: '0x0000000000000000000000000000000000000001',
  account: '0x0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c',
  chain: 'BNB Smart Chain Testnet',
}

const RED: StakeIntent = { ...PLACE, amount: tokenWei(500n), team: 'red' }

const run = (events: readonly StakeFlowEvent[]): StakeFlow =>
  events.reduce<StakeFlow>((flow, event) => stakeFlowReducer(flow, event), IDLE_FLOW)

const approve: StakeFlowEvent = { type: 'approve', intent: RED }
const stake: StakeFlowEvent = { type: 'stake', intent: RED }
const ev = (type: 'approved' | 'approveFailed' | 'staked' | 'stakeFailed' | 'abandoned') =>
  ({ type }) as const

describe('firstStep', () => {
  it('approves only when the allowance is below the amount', () => {
    expect(firstStep(tokenWei(0n), tokenWei(5n))).toBe('approve')
    expect(firstStep(tokenWei(4n), tokenWei(5n))).toBe('approve')
    expect(firstStep(tokenWei(5n), tokenWei(5n))).toBe('stake')
  })
})

describe('intentOf', () => {
  it('needs a wallet, an amount and a side, and never picks a side itself', () => {
    expect(intentOf(PLACE, tokenWei(5n), null)).toBeNull()
    expect(intentOf(null, tokenWei(5n), 'red')).toBeNull()
    expect(intentOf(PLACE, null, 'red')).toBeNull()
    expect(intentOf(PLACE, tokenWei(500n), 'red')).toEqual(RED)
  })
})

describe('stakeFlowReducer', () => {
  it('walks approve then stake with the intent frozen at the press', () => {
    expect(run([approve])).toEqual({ kind: 'approving', intent: RED })
    expect(stakeNoteOf(run([approve]), 'approve')).toBe(VAULT_COPY.stake.stepApprove)
    const staking = run([approve, ev('approved')])
    expect(staking).toEqual({ kind: 'staking', intent: RED, afterApproval: true })
    expect(stakeNoteOf(staking, 'stake')).toBe(VAULT_COPY.stake.stepStake)
    expect(run([approve, ev('approved'), ev('staked')])).toEqual(IDLE_FLOW)
  })

  it('keeps the confirmed amount when the balance changes between the steps', () => {
    const flow = run([approve])
    const grown = intentOf(PLACE, tokenWei(900n), 'red')
    expect(grown?.amount).toBe(900n)
    expect(stakeToChain(flow, PLACE)).toEqual(RED)
    expect(stakeToChain(flow, PLACE)?.amount).toBe(500n)
  })

  it('chains the stake only for an approval started in this mount and place', () => {
    expect(stakeToChain(run([approve]), PLACE)).toEqual(RED)
    expect(stakeToChain(IDLE_FLOW, PLACE)).toBeNull()
    const other: Address = '0x71c4a2d9e8b3f6c5a4d7e2b1c0f9e8d7c6b59e02'
    expect(stakeToChain(run([approve]), { ...PLACE, account: other })).toBeNull()
    expect(stakeToChain(run([approve]), { ...PLACE, chain: 'BNB Smart Chain' })).toBeNull()
    expect(stakeToChain(run([approve]), { ...PLACE, launcher: other })).toBeNull()
    expect(stakeToChain(run([approve]), null)).toBeNull()
  })

  it('ends a resumed approval after a reload in the approved state, without staking', () => {
    const resumed = run([ev('approved')])
    expect(resumed).toEqual({ kind: 'retry' })
    expect(stakeToChain(IDLE_FLOW, PLACE)).toBeNull()
    expect(stakeNoteOf(resumed, 'stake')).toBe(VAULT_COPY.stake.approvedRetry)
  })

  it('offers only the stake step after a stake fails behind a confirmed approval', () => {
    const failed = run([approve, ev('approved'), ev('stakeFailed')])
    expect(failed).toEqual({ kind: 'retry' })
    expect(stakeNoteOf(failed, 'stake')).toBe(VAULT_COPY.stake.approvedRetry)
    expect(stakeNoteOf(failed, 'approve')).toBeNull()
    expect(run([approve, ev('approved'), ev('stakeFailed'), stake])).toEqual({
      kind: 'staking',
      intent: RED,
      afterApproval: true,
    })
  })

  it('goes back to idle when the approval or a single stake fails', () => {
    expect(run([approve, ev('approveFailed')])).toEqual(IDLE_FLOW)
    expect(run([stake])).toEqual({ kind: 'staking', intent: RED, afterApproval: false })
    expect(run([stake, ev('stakeFailed')])).toEqual(IDLE_FLOW)
  })

  it('lets a new step start after a transaction was dropped without a result', () => {
    expect(run([approve, stake])).toEqual({ kind: 'approving', intent: RED })
    expect(run([approve, ev('abandoned'), stake])).toEqual({
      kind: 'staking',
      intent: RED,
      afterApproval: false,
    })
    expect(run([approve, ev('approved'), ev('stakeFailed'), ev('abandoned')])).toEqual({
      kind: 'retry',
    })
  })
})
