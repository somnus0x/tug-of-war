import type { LaunchedClaim } from './launched-claim'
import type { Player } from '@/contracts/types'

import { describe, expect, it } from 'vitest'

import { FIXTURE_ADDRESSES } from '@/contracts/fixtures/constants'
import { tokenWei } from '@/lib/units'

import { endedViewOf } from './ended-view'
import { RULES, bnb, failGate, gameOf, okGate, playerOf } from './fixture-games'
import { claimGateFor, launchedClaimOf, playerReadStateOf } from './launched-claim'

const GAME = gameOf('launched')
const ME = FIXTURE_ADDRESSES.fanBlue
const POOL = 'The pool holds 5.00 BNB and 500,000 ROPE.'

const viewOf = (claim: LaunchedClaim) =>
  endedViewOf({ kind: 'launched', raised: bnb('5') }, GAME, RULES, false, claim)

const coins = (claimable: string, claimed: string, team: Player['team'] = 'blue'): Player => ({
  ...playerOf('fan-blue', GAME),
  team,
  claimable: tokenWei(BigInt(claimable) * 10n ** 18n),
  claimed: tokenWei(BigInt(claimed) * 10n ** 18n),
})

describe('launchedClaimOf', () => {
  it('reads each kind of viewer', () => {
    expect(
      launchedClaimOf({ playerRead: 'current', account: undefined, player: null, claimGate: null }),
    ).toBe('visitor')
    expect(
      launchedClaimOf({ playerRead: 'current', account: ME, player: null, claimGate: null }),
    ).toBe('unknown')
    expect(
      launchedClaimOf({
        playerRead: 'current',
        account: ME,
        player: coins('10', '0'),
        claimGate: okGate,
      }),
    ).toBe('claim')
    expect(
      launchedClaimOf({
        playerRead: 'current',
        account: ME,
        player: coins('10', '0'),
        claimGate: failGate('NotLaunched'),
      }),
    ).toBe('checking')
    expect(
      launchedClaimOf({
        playerRead: 'current',
        account: ME,
        player: coins('10', '0'),
        claimGate: null,
      }),
    ).toBe('checking')
    expect(
      launchedClaimOf({
        playerRead: 'current',
        account: ME,
        player: coins('0', '10'),
        claimGate: okGate,
      }),
    ).toBe('claimed')
    expect(
      launchedClaimOf({
        playerRead: 'current',
        account: ME,
        player: coins('0', '0', 'none'),
        claimGate: null,
      }),
    ).toBe('none')
  })

  it('reads the mock viewers by their own player view', () => {
    expect(
      launchedClaimOf({
        playerRead: 'current',
        account: ME,
        player: playerOf('fan-blue', GAME),
        claimGate: okGate,
      }),
    ).toBe('claim')
    expect(
      launchedClaimOf({
        playerRead: 'current',
        account: ME,
        player: playerOf('holder-blue', GAME),
        claimGate: okGate,
      }),
    ).toBe('claimed')
    expect(
      launchedClaimOf({
        playerRead: 'current',
        account: ME,
        player: playerOf('fan-new', GAME),
        claimGate: okGate,
      }),
    ).toBe('none')
  })
})

describe('launched panel text', () => {
  it('promises coins only to a wallet that can claim them', () => {
    expect(viewOf('claim')).toEqual({
      title: 'Rope Coin is live',
      body: `${POOL} Claim your coins next.`,
      action: { kind: 'vault', claim: true, primary: true },
    })
  })

  it('points everyone else to the vault without a claim', () => {
    expect(viewOf('visitor')?.body).toBe(`${POOL} Connect a wallet to see its coins.`)
    expect(viewOf('unknown')?.body).toBe(POOL)
    expect(viewOf('checking')?.body).toBe(`${POOL} Your coins are being checked.`)
    expect(viewOf('claimed')?.body).toBe(`${POOL} Your coins are claimed. Stake them in the vault.`)
    expect(viewOf('none')?.body).toBe(
      `${POOL} This wallet did not pull in this game, so it has no coins to claim. Anyone who holds ROPE can stake.`,
    )
    for (const claim of ['visitor', 'unknown', 'checking', 'claimed', 'none'] as const) {
      expect(viewOf(claim)?.action).toMatchObject({ kind: 'vault', claim: false })
    }
    expect(viewOf('claimed')?.action).toMatchObject({ primary: true })
    expect(viewOf('none')?.action).toMatchObject({ primary: false })
  })
})

describe('reads that are not current for this wallet', () => {
  const cachedNever = coins('0', '0', 'none')

  it('shows the neutral row until the wallet read is current', () => {
    expect(
      launchedClaimOf({
        account: ME,
        player: cachedNever,
        playerRead: 'pending',
        claimGate: okGate,
      }),
    ).toBe('unknown')
    expect(
      launchedClaimOf({
        account: ME,
        player: coins('0', '10'),
        playerRead: 'pending',
        claimGate: null,
      }),
    ).toBe('unknown')
  })

  it('counts a read as current only after a successful fetch on this page', () => {
    expect(playerReadStateOf({ isSuccess: true, isFetchedAfterMount: true })).toBe('current')
    expect(playerReadStateOf({ isSuccess: true, isFetchedAfterMount: false })).toBe('pending')
    expect(playerReadStateOf({ isSuccess: false, isFetchedAfterMount: true })).toBe('pending')
  })

  it('uses the claim gate only when it is fresh and for this wallet', () => {
    const other = FIXTURE_ADDRESSES.fanRed
    expect(claimGateFor({ account: ME, gate: okGate, isFresh: true }, ME)).toBe(okGate)
    expect(claimGateFor({ account: other, gate: okGate, isFresh: true }, ME)).toBeNull()
    expect(claimGateFor({ account: ME, gate: okGate, isFresh: false }, ME)).toBeNull()
    expect(claimGateFor({ account: ME, gate: okGate, isFresh: true }, undefined)).toBeNull()
  })
})
