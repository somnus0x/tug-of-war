import type { WalletRead } from './wallet-read'
import type { CaptainRead } from '@/contracts/captain-types'
import type { ViewerName } from '@/contracts/fixtures/viewers'
import type { Player } from '@/contracts/types'
import type { Staker } from '@/contracts/vault-types'
import type { Address } from 'viem'

import { describe, expect, it } from 'vitest'

import { readCaptain } from '@/contracts/fixtures/captain-world'
import { vaultWorldOf } from '@/contracts/fixtures/vault-world'
import { viewerAddress } from '@/contracts/fixtures/viewers'
import { createFixtureWorld } from '@/contracts/fixtures/world'
import { bnbWei, tokenWei } from '@/lib/units'

import { DESK_ORDER, cardActionsOf, orderClassOf, phoneCardOrder } from './card-order'
import { walletReadOf } from './wallet-read'

const LAUNCHER: Address = '0x0000000000000000000000000000000000000001'

const orderFor = (viewer: ViewerName, canClaim: boolean | null = true) => {
  const world = createFixtureWorld({ nowSeconds: () => 1_800_000_000 })
  const vaults = vaultWorldOf(world)
  const scope = { fixture: 'launched', viewer }
  const account = viewerAddress(viewer)
  const context = account === undefined ? null : { launcher: LAUNCHER, account, scope }
  const player: WalletRead<Player> = walletReadOf(
    account,
    context === null ? undefined : world.player(LAUNCHER, context.account, scope).player,
    false,
  )
  const staker: WalletRead<Staker> = walletReadOf(
    account,
    context === null ? undefined : vaults.staker(context),
    false,
  )
  const captain: WalletRead<CaptainRead> = walletReadOf(
    account,
    context === null ? undefined : readCaptain(vaults, context),
    false,
  )
  return phoneCardOrder(cardActionsOf({ player, staker, captain, canClaim }))
}

describe('phoneCardOrder', () => {
  it('keeps the desk order when nothing can be done', () => {
    expect(phoneCardOrder({})).toEqual(DESK_ORDER)
    expect(orderFor('visitor')).toEqual(DESK_ORDER)
  })

  it('puts what the wallet can do now first, in action order', () => {
    expect(phoneCardOrder({ rewards: true, stake: true, coins: true })).toEqual([
      'coins',
      'stake',
      'rewards',
      'captainCoins',
      'captainShare',
      'pools',
    ])
    expect(phoneCardOrder({ rewards: true })).toEqual([
      'rewards',
      'coins',
      'stake',
      'captainCoins',
      'captainShare',
      'pools',
    ])
  })

  it('leads with the claim for a player who has not claimed', () => {
    expect(orderFor('fan-blue')[0]).toBe('coins')
    expect(orderFor('fan-blue', null)[0]).toBe('coins')
    expect(orderFor('fan-blue', false)).toEqual(DESK_ORDER)
  })

  it('leads with staking for a holder and rewards for a staker', () => {
    expect(orderFor('holder-free')[0]).toBe('stake')
    expect(orderFor('staker-rewards').slice(0, 2)).toEqual(['stake', 'rewards'])
  })

  it('shows a captain with something claimable the captain cards before the pools', () => {
    const order = orderFor('captain-blue')
    expect(order.indexOf('captainCoins')).toBeLessThan(order.indexOf('pools'))
    expect(order.indexOf('captainShare')).toBeLessThan(order.indexOf('pools'))
  })

  it('names a slot class by position', () => {
    expect(orderClassOf(['rewards', 'coins'], 'coins')).toBe('vault-slot vault-slot--2')
  })

  it('counts a wallet whose whole balance is staked as able to act on the stake card', () => {
    const staker: WalletRead<Staker> = {
      kind: 'ready',
      value: {
        team: 'blue',
        staked: tokenWei(4000n * 10n ** 18n),
        pendingRewards: bnbWei(0n),
        tokenBalance: tokenWei(0n),
        allowance: tokenWei(0n),
      },
    }
    const actions = cardActionsOf({
      player: { kind: 'loading' },
      staker,
      captain: { kind: 'loading' },
      canClaim: false,
    })
    expect(actions.stake).toBe(true)
    expect(phoneCardOrder(actions)[0]).toBe('stake')
  })
})
