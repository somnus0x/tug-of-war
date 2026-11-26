import type { PickedTeam } from '../tx/actions'
import type { Player, SourceScope, TeamPair } from '../types'
import type { Staker, Vault } from '../vault-types'
import type { FixtureWorld } from './world'
import type { Team } from '@/lib/team'
import type { Address } from 'viem'

import { bnbWei, tokenWei } from '@/lib/units'

import { resolveFixture } from './catalog'
import { FIXTURE_CAPTAIN_ACCRUED, basePools, rewardRates, stakerSeed } from './vault-seeds'
import { resolveViewer } from './viewers'

export type StakerOverlay = {
  readonly team: Team
  readonly stakedDelta: bigint
  readonly balanceDelta: bigint
  readonly rewardsClaimed: boolean
  readonly allowance: bigint | null
}

export type VaultState = {
  readonly pool: TeamPair<bigint>
  readonly captainClaimed: TeamPair<boolean>
  readonly stakers: Readonly<Record<string, StakerOverlay>>
}

export const EMPTY_STAKER_OVERLAY: StakerOverlay = {
  team: 'none',
  stakedDelta: 0n,
  balanceDelta: 0n,
  rewardsClaimed: false,
  allowance: null,
}

export const EMPTY_VAULT_STATE: VaultState = {
  pool: { blue: 0n, red: 0n },
  captainClaimed: { blue: false, red: false },
  stakers: {},
}

export type StakerContext = {
  readonly launcher: Address
  readonly account: Address
  readonly scope: SourceScope
}

export type VaultWorld = {
  readonly world: FixtureWorld
  readonly state: (launcher: Address, scope: SourceScope) => VaultState
  readonly commit: (launcher: Address, scope: SourceScope, state: VaultState) => void
  readonly vault: (launcher: Address, scope: SourceScope) => Vault
  readonly staker: (context: StakerContext) => Staker
  readonly player: (context: StakerContext) => Player
  readonly captainTeam: (launcher: Address, account: Address, scope: SourceScope) => Team
}

const clamp = (value: bigint): bigint => (value > 0n ? value : 0n)

export const stakerKey = (account: Address): string => account.toLowerCase()

export const stakerOverlayOf = (state: VaultState, account: Address): StakerOverlay =>
  state.stakers[stakerKey(account)] ?? EMPTY_STAKER_OVERLAY

export const addToPool = (pool: TeamPair<bigint>, team: PickedTeam, by: bigint): TeamPair<bigint> =>
  team === 'blue'
    ? { blue: pool.blue + by, red: pool.red }
    : { blue: pool.blue, red: pool.red + by }

const createVaultWorld = (world: FixtureWorld): VaultWorld => {
  const states = new Map<string, VaultState>()
  const stateOf = (launcher: Address, scope: SourceScope): VaultState =>
    states.get(world.overlayKey(launcher, scope)) ?? EMPTY_VAULT_STATE

  const player = ({ launcher, account, scope }: StakerContext): Player =>
    world.player(launcher, account, scope).player

  const seedTeam = (context: StakerContext): Team => {
    const seed = stakerSeed(resolveViewer(context.scope.viewer, true))
    return seed.team ?? player(context).team
  }

  const staker = (context: StakerContext): Staker => {
    const seed = stakerSeed(resolveViewer(context.scope.viewer, true))
    const overlay = stakerOverlayOf(stateOf(context.launcher, context.scope), context.account)
    const claimed = player(context).claimed
    const team = overlay.team === 'none' ? seedTeam(context) : overlay.team
    return {
      team,
      staked: tokenWei(clamp(seed.staked + overlay.stakedDelta)),
      pendingRewards: bnbWei(overlay.rewardsClaimed ? 0n : seed.pending),
      tokenBalance: tokenWei(clamp(claimed + seed.held - seed.staked + overlay.balanceDelta)),
      allowance: tokenWei(overlay.allowance ?? seed.allowance),
    }
  }

  const vault = (launcher: Address, scope: SourceScope): Vault => {
    const { game } = world.game(launcher, scope)
    const state = stateOf(launcher, scope)
    const seed = stakerSeed(resolveViewer(scope.viewer, false))
    const base = basePools(resolveFixture(scope.fixture))
    const seedSide = seed.team ?? world.player(launcher, undefined, scope).player.team
    const withSeed =
      seed.staked === 0n || seedSide === 'none' ? base : addToPool(base, seedSide, seed.staked)
    const pool = {
      blue: clamp(withSeed.blue + state.pool.blue),
      red: clamp(withSeed.red + state.pool.red),
    }
    const rates = rewardRates({
      teamStaked: pool,
      finalBlueShareBps: game.finalBlueShareBps,
      captainShareBps: game.config.captainShareBps,
    })
    return {
      teamStaked: { blue: tokenWei(pool.blue), red: tokenWei(pool.red) },
      rewardPer1000NewTokensPerBnb: { blue: bnbWei(rates.blue), red: bnbWei(rates.red) },
      captainAccrued: {
        blue: bnbWei(FIXTURE_CAPTAIN_ACCRUED.blue),
        red: bnbWei(FIXTURE_CAPTAIN_ACCRUED.red),
      },
      captainClaimed: {
        blue: bnbWei(state.captainClaimed.blue ? FIXTURE_CAPTAIN_ACCRUED.blue : 0n),
        red: bnbWei(state.captainClaimed.red ? FIXTURE_CAPTAIN_ACCRUED.red : 0n),
      },
      undistributed: bnbWei(0n),
    }
  }

  return {
    world,
    state: stateOf,
    commit: (launcher, scope, state) => {
      states.set(world.overlayKey(launcher, scope), state)
    },
    vault,
    staker,
    player,
    captainTeam: (launcher, account, scope) => {
      const { game } = world.game(launcher, scope)
      const lower = account.toLowerCase()
      if (lower === game.config.captainBlue.toLowerCase()) return 'blue'
      return lower === game.config.captainRed.toLowerCase() ? 'red' : 'none'
    },
  }
}

const VAULT_WORLDS = new WeakMap<FixtureWorld, VaultWorld>()

export const vaultWorldOf = (world: FixtureWorld): VaultWorld => {
  const known = VAULT_WORLDS.get(world)
  if (known !== undefined) {
    return known
  }
  const created = createVaultWorld(world)
  VAULT_WORLDS.set(world, created)
  return created
}
