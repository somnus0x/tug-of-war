import type { TeamPair } from '../types'
import type { FixtureName } from './catalog'
import type { ViewerName } from './viewers'
import type { Team } from '@/lib/team'
import type { Bps } from '@/lib/units'

import { parseEther } from 'viem'

import { BPS_DENOMINATOR, mulBps } from '@/lib/units'

export type StakerSeed = {
  readonly held: bigint
  readonly staked: bigint
  readonly pending: bigint
  readonly allowance: bigint
  readonly team?: Exclude<Team, 'none'>
}

const COIN = 10n ** 18n

const coins = (whole: bigint): bigint => whole * COIN

const EMPTY_SEED: StakerSeed = { held: 0n, staked: 0n, pending: 0n, allowance: 0n }

const SEEDS: Partial<Record<ViewerName, StakerSeed>> = {
  'holder-free': { ...EMPTY_SEED, held: coins(2_400n) },
  'staker-rewards': {
    ...EMPTY_SEED,
    staked: coins(6_000n),
    pending: parseEther('0.0381'),
  },
  'staker-quiet': { ...EMPTY_SEED, staked: coins(4_000n), allowance: coins(10_000n) },
}

export const stakerSeed = (viewer: ViewerName): StakerSeed => SEEDS[viewer] ?? EMPTY_SEED

const NO_POOLS: TeamPair<bigint> = { blue: 0n, red: 0n }

const BASE_POOLS: Partial<Record<FixtureName, TeamPair<bigint>>> = {
  launched: { blue: coins(41_250n), red: coins(18_600n) },
}

export const basePools = (fixture: FixtureName): TeamPair<bigint> => BASE_POOLS[fixture] ?? NO_POOLS

export const FIXTURE_CAPTAIN_ACCRUED: TeamPair<bigint> = {
  blue: parseEther('0.042'),
  red: parseEther('0.028'),
}

const ONE_BNB = 10n ** 18n

const NEW_STAKE = 1000n * COIN

export type RateInput = {
  readonly teamStaked: TeamPair<bigint>
  readonly finalBlueShareBps: Bps
  readonly captainShareBps: Bps
}

export const rewardRates = ({
  teamStaked,
  finalBlueShareBps,
  captainShareBps,
}: RateInput): TeamPair<bigint> => {
  const stakers = ONE_BNB - mulBps(ONE_BNB, captainShareBps)
  const blue = (stakers * BigInt(finalBlueShareBps)) / BigInt(BPS_DENOMINATOR)
  const portions = { blue, red: stakers - blue }
  const rateFor = (team: 'blue' | 'red', other: 'blue' | 'red'): bigint => {
    const portion = teamStaked[other] === 0n ? stakers : portions[team]
    return (portion * NEW_STAKE) / (teamStaked[team] + NEW_STAKE)
  }
  return { blue: rateFor('blue', 'red'), red: rateFor('red', 'blue') }
}
