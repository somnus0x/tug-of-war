import type { PullButtonInput } from './pull-button'
import type { ContributePreview } from '@/contracts/types'

import { describe, expect, it } from 'vitest'

import { bps, pullWei } from '@/lib/units'

import { bnb } from './fixture-games'
import { isPullButtonEnabled, pullButtonOf, pullTileStateOf } from './pull-button'

const PREVIEW: ContributePreview = {
  pull: pullWei(10n ** 17n),
  newRopeBps: bps(5500),
  wouldTriggerOvertime: false,
}

const READY: PullButtonInput = {
  hasAccount: true,
  isWrongNetwork: false,
  team: 'blue',
  entry: { kind: 'amount', amount: bnb('0.1') },
  validation: { kind: 'ready', preview: PREVIEW },
}

describe('pullButtonOf', () => {
  it('asks a visitor to connect first', () => {
    expect(pullButtonOf({ ...READY, hasAccount: false, isWrongNetwork: true, team: null })).toEqual(
      { kind: 'connect' },
    )
  })

  it('asks to switch network before anything else', () => {
    expect(pullButtonOf({ ...READY, isWrongNetwork: true, team: null })).toEqual({
      kind: 'switchNetwork',
    })
  })

  it('asks for a team before the amount', () => {
    expect(pullButtonOf({ ...READY, team: null, entry: { kind: 'invalid' } })).toEqual({
      kind: 'pickTeam',
    })
  })

  it('asks for an amount when the text is empty, zero or not a number', () => {
    expect(
      pullButtonOf({ ...READY, entry: { kind: 'empty' }, validation: { kind: 'idle' } }),
    ).toEqual({ kind: 'enterAmount' })
    expect(
      pullButtonOf({
        ...READY,
        entry: { kind: 'amount', amount: bnb('0') },
        validation: { kind: 'idle' },
      }),
    ).toEqual({ kind: 'enterAmount' })
    expect(pullButtonOf({ ...READY, entry: { kind: 'invalid' } })).toEqual({ kind: 'badAmount' })
  })

  it('blocks on a failed check', () => {
    const validation = { kind: 'error', check: 'gate', reason: 'BuyInClosed' } as const
    expect(pullButtonOf({ ...READY, validation })).toEqual({ kind: 'blocked', team: 'blue' })
  })

  it('waits while the contract checks the amount', () => {
    expect(pullButtonOf({ ...READY, team: 'red', validation: { kind: 'checking' } })).toEqual({
      kind: 'checking',
      team: 'red',
    })
  })

  it('waits while the balance is read', () => {
    expect(pullButtonOf({ ...READY, validation: { kind: 'readingWallet' } })).toEqual({
      kind: 'readingWallet',
      team: 'blue',
    })
    expect(isPullButtonEnabled({ kind: 'readingWallet', team: 'blue' })).toBe(false)
  })

  it('pulls once the gate and the preview are in', () => {
    expect(pullButtonOf(READY)).toEqual({ kind: 'pull', team: 'blue' })
  })
})

describe('isPullButtonEnabled', () => {
  it('enables only the buttons that do something', () => {
    expect(isPullButtonEnabled({ kind: 'connect' })).toBe(true)
    expect(isPullButtonEnabled({ kind: 'switchNetwork' })).toBe(true)
    expect(isPullButtonEnabled({ kind: 'pull', team: 'red' })).toBe(true)
    expect(isPullButtonEnabled({ kind: 'pickTeam' })).toBe(false)
    expect(isPullButtonEnabled({ kind: 'enterAmount' })).toBe(false)
    expect(isPullButtonEnabled({ kind: 'badAmount' })).toBe(false)
    expect(isPullButtonEnabled({ kind: 'blocked', team: 'blue' })).toBe(false)
    expect(isPullButtonEnabled({ kind: 'checking', team: 'blue' })).toBe(false)
  })
})

describe('pullTileStateOf', () => {
  it('shows the transaction stage while one is running', () => {
    expect(pullTileStateOf({ kind: 'pull', team: 'blue' }, 'wallet')).toBe('wallet')
    expect(pullTileStateOf({ kind: 'enterAmount' }, 'pending')).toBe('pending')
  })

  it('disables a button that has nothing to do', () => {
    expect(pullTileStateOf({ kind: 'pull', team: 'blue' }, 'idle')).toBe('idle')
    expect(pullTileStateOf({ kind: 'checking', team: 'blue' }, 'idle')).toBe('disabled')
  })
})
