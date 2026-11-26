import type { Game, GameConfig, Rules, TeamPair } from '../types'
import type { Phase } from '@/lib/phase'
import type { Bps, PullWei } from '@/lib/units'
import type { Address } from 'viem'

import { parseEther } from 'viem'

import { weightBpsAt } from '@/lib/clock'
import { BPS_DENOMINATOR, bnbWei, bps, mulBps, pullWei, shareBps } from '@/lib/units'

import { FIXTURE_ADDRESSES, FIXTURE_RULES, FIXTURE_SALT, ZERO_ADDRESS } from './constants'

export type TeamInput = { readonly bnb: string; readonly pull: string; readonly players: number }

export type WaitingSpec = {
  readonly stage: 'waiting'
  readonly acceptLeft: number
  readonly captainsIn: TeamPair<boolean>
  readonly cancelled?: boolean
}

export type LiveSpec = {
  readonly stage: 'live'
  readonly secondsLeft: number
  readonly extensionsUsed: number
  readonly blue: TeamInput
  readonly red: TeamInput
  readonly autoLaunch?: boolean
  readonly launched?: boolean
}

export type FixtureSpec = (WaitingSpec | LiveSpec) & {
  readonly minRaise?: string
  readonly floorBlocked?: boolean
}

export type BuildContext = {
  readonly launcher: Address
  readonly loadTime: number
  readonly now: number
  readonly rules?: Rules
}

const ACCEPT_WINDOW = 3600
const DURATION = 180
const START_TO_ACCEPT_DEADLINE = 1200

export const fixtureConfig = (minRaise: string): GameConfig => ({
  name: 'Rope Coin',
  symbol: 'ROPE',
  meta: 'bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy',
  salt: FIXTURE_SALT,
  duration: DURATION,
  minRaise: bnbWei(parseEther(minRaise)),
  walletCap: bnbWei(parseEther('0.5')),
  captainBlue: FIXTURE_ADDRESSES.captainBlue,
  captainRed: FIXTURE_ADDRESSES.captainRed,
  vaultFactory: FIXTURE_ADDRESSES.vaultFactory,
  maxBonusShareBps: FIXTURE_RULES.maxBonusShareBps,
  captainMinDeposit: bnbWei(parseEther('0.1')),
  acceptWindow: ACCEPT_WINDOW,
  captainAllocBps: FIXTURE_RULES.captainAllocBps,
  captainVestDuration: FIXTURE_RULES.captainVestDuration,
  captainShareBps: FIXTURE_RULES.captainShareBps,
})

export const ropeBpsOf = (pull: TeamPair<PullWei>): Bps => shareBps(pull.blue, pull.blue + pull.red)

export const finalBlueShareOf = (pull: TeamPair<PullWei>, maxBonusShareBps: Bps): Bps => {
  if (pull.red === 0n) {
    return bps(pull.blue === 0n ? BPS_DENOMINATOR / 2 : BPS_DENOMINATOR)
  }
  if (pull.blue === 0n) {
    return bps(0)
  }
  const floor = BPS_DENOMINATOR - maxBonusShareBps
  return bps(Math.min(maxBonusShareBps, Math.max(floor, ropeBpsOf(pull))))
}

export const livePhaseAt = (
  now: number,
  deadline: number,
  minMet: boolean,
  launchGrace: number,
  launched: boolean,
): Phase => {
  if (launched) {
    return 'launched'
  }
  if (now < deadline) {
    return 'buyIn'
  }
  if (!minMet || now >= deadline + launchGrace) {
    return 'refunding'
  }
  return 'awaitingLaunch'
}

const pairOf = <T>(blue: T, red: T): TeamPair<T> => ({ blue, red })

const UNSET = {
  autoLaunchRequestId: 0n,
  triggerBudget: bnbWei(0n),
  triggerFunder: ZERO_ADDRESS,
  token: ZERO_ADDRESS,
  pool: ZERO_ADDRESS,
  vault: ZERO_ADDRESS,
  finalBlueShareBps: bps(0),
}

const buildWaiting = (spec: WaitingSpec, config: GameConfig, context: BuildContext): Game => {
  const rules = context.rules ?? FIXTURE_RULES
  const deposit = (isIn: boolean) => bnbWei(isIn ? config.captainMinDeposit : 0n)
  const raisedByTeam = pairOf(deposit(spec.captainsIn.blue), deposit(spec.captainsIn.red))
  const pullByTeam = pairOf(
    pullWei(mulBps(raisedByTeam.blue, rules.startWeightBps)),
    pullWei(mulBps(raisedByTeam.red, rules.startWeightBps)),
  )
  return {
    launcher: context.launcher,
    creator: FIXTURE_ADDRESSES.creator,
    factory: FIXTURE_ADDRESSES.factory,
    config,
    phase: spec.cancelled === true ? 'cancelled' : 'awaitingCaptains',
    captainDeposited: spec.captainsIn,
    acceptDeadline: context.loadTime + spec.acceptLeft,
    gameStart: 0,
    originalDeadline: 0,
    deadline: 0,
    extensionsUsed: 0,
    currentWeightBps: rules.startWeightBps,
    raised: bnbWei(raisedByTeam.blue + raisedByTeam.red),
    raisedByTeam,
    pullByTeam,
    playersByTeam: pairOf(spec.captainsIn.blue ? 1 : 0, spec.captainsIn.red ? 1 : 0),
    ropeBps: ropeBpsOf(pullByTeam),
    ...UNSET,
  }
}

const buildLive = (spec: LiveSpec, config: GameConfig, context: BuildContext): Game => {
  const rules = context.rules ?? FIXTURE_RULES
  const deadline = context.loadTime + spec.secondsLeft
  const originalDeadline = deadline - spec.extensionsUsed * rules.overtimeExtension
  const gameStart = originalDeadline - config.duration
  const raisedByTeam = pairOf(bnbWei(parseEther(spec.blue.bnb)), bnbWei(parseEther(spec.red.bnb)))
  const pullByTeam = pairOf(pullWei(parseEther(spec.blue.pull)), pullWei(parseEther(spec.red.pull)))
  const raised = bnbWei(raisedByTeam.blue + raisedByTeam.red)
  const launched = spec.launched === true
  const phase = livePhaseAt(
    context.now,
    deadline,
    raised >= config.minRaise,
    rules.launchGrace,
    launched,
  )
  const autoLaunch = spec.autoLaunch === true
  return {
    launcher: context.launcher,
    creator: FIXTURE_ADDRESSES.creator,
    factory: FIXTURE_ADDRESSES.factory,
    config,
    phase,
    captainDeposited: pairOf(true, true),
    acceptDeadline: gameStart + START_TO_ACCEPT_DEADLINE,
    gameStart,
    originalDeadline,
    deadline,
    extensionsUsed: spec.extensionsUsed,
    currentWeightBps: weightBpsAt(
      { gameStart, originalDeadline, startWeightBps: rules.startWeightBps },
      context.now,
    ),
    raised,
    raisedByTeam,
    pullByTeam,
    playersByTeam: pairOf(spec.blue.players, spec.red.players),
    ropeBps: ropeBpsOf(pullByTeam),
    ...UNSET,
    ...(autoLaunch
      ? {
          triggerFunder: FIXTURE_ADDRESSES.funder,
          triggerBudget: bnbWei(parseEther('0.006')),
        }
      : {}),
    ...(launched
      ? {
          token: FIXTURE_ADDRESSES.token,
          pool: FIXTURE_ADDRESSES.pool,
          vault: FIXTURE_ADDRESSES.vault,
          finalBlueShareBps: finalBlueShareOf(pullByTeam, config.maxBonusShareBps),
        }
      : {}),
  }
}

export const buildGame = (spec: FixtureSpec, context: BuildContext): Game => {
  const config = fixtureConfig(spec.minRaise ?? '3')
  return spec.stage === 'waiting'
    ? buildWaiting(spec, config, context)
    : buildLive(spec, config, context)
}
