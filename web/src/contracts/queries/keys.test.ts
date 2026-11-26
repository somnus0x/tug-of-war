import { parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { bnbWei } from '@/lib/units'

import { CHAIN_SCOPE } from '../scope'
import { queryKeys } from './keys'

const launcher = '0x1111111111111111111111111111111111111111'
const account = '0x2222222222222222222222222222222222222222'

const hasBigint = (value: readonly unknown[]): boolean =>
  value.some((part) => typeof part === 'bigint')

describe('queryKeys', () => {
  it('builds chain keys without a fixture suffix', () => {
    expect(queryKeys.game(97, launcher, CHAIN_SCOPE)).toEqual(['game', 97, launcher])
    expect(queryKeys.rules(97, launcher, CHAIN_SCOPE)).toEqual(['rules', 97, launcher])
    expect(queryKeys.launcher(97, launcher, CHAIN_SCOPE)).toEqual(['launcher', 97, launcher])
    expect(queryKeys.player(97, launcher, account, CHAIN_SCOPE)).toEqual([
      'player',
      97,
      launcher,
      account,
    ])
  })

  it('keeps gates keys free of bigint', () => {
    const draft = { team: 'blue', amount: bnbWei(parseEther('0.25')) } as const
    const key = queryKeys.gates(97, launcher, account, 'buyIn', draft, CHAIN_SCOPE)
    expect(key).toEqual(['gates', 97, launcher, account, 'buyIn', 'blue', '250000000000000000'])
    expect(hasBigint(key)).toBe(false)
    expect(() => JSON.stringify(key)).not.toThrow()
  })

  it('separates fixtures and viewers', () => {
    const scope = { fixture: 'live-tie', viewer: 'fan-red' }
    expect(queryKeys.game(97, launcher, scope)).toEqual([
      'game',
      97,
      launcher,
      'fixture',
      'live-tie',
      'fan-red',
    ])
    expect(queryKeys.player(97, launcher, undefined, scope)[3]).toBe('none')
  })
})
