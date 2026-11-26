import type { Game, PlayerRead, Rules, TeamPair } from '../types'
import type { Team } from '@/lib/team'
import type { Address } from 'viem'

import { weightBpsAt } from '@/lib/clock'
import { bnbWei, pullWei, tokenWei } from '@/lib/units'

import { finalBlueShareOf, livePhaseAt, ropeBpsOf } from './builder'
import { FIXTURE_ADDRESSES } from './constants'
import { entitlements } from './viewers'

export type PlayerOverlay = {
  readonly team: Team
  readonly contribution: bigint
  readonly pull: bigint
  readonly spent: bigint
  readonly refunded: boolean
  readonly claimed: boolean
}

export type GameOverlay = {
  readonly raisedByTeam: TeamPair<bigint>
  readonly pullByTeam: TeamPair<bigint>
  readonly playersByTeam: TeamPair<number>
  readonly extensions: number
  readonly captainsIn: TeamPair<boolean>
  readonly startedAt: number | null
  readonly cancelled: boolean
  readonly launched: boolean
  readonly autoLaunch: { readonly funder: Address; readonly budget: bigint } | null
  readonly budgetWithdrawn: boolean
  readonly players: Readonly<Record<string, PlayerOverlay>>
}

export const EMPTY_PLAYER_OVERLAY: PlayerOverlay = {
  team: 'none',
  contribution: 0n,
  pull: 0n,
  spent: 0n,
  refunded: false,
  claimed: false,
}

export const EMPTY_OVERLAY: GameOverlay = {
  raisedByTeam: { blue: 0n, red: 0n },
  pullByTeam: { blue: 0n, red: 0n },
  playersByTeam: { blue: 0, red: 0 },
  extensions: 0,
  captainsIn: { blue: false, red: false },
  startedAt: null,
  cancelled: false,
  launched: false,
  autoLaunch: null,
  budgetWithdrawn: false,
  players: {},
}

const addPair = (a: TeamPair<bigint>, b: TeamPair<bigint>): TeamPair<bigint> => ({
  blue: a.blue + b.blue,
  red: a.red + b.red,
})

export const playerKey = (account: Address): string => account.toLowerCase()

export const playerOverlayOf = (
  overlay: GameOverlay,
  account: Address | undefined,
): PlayerOverlay =>
  account === undefined
    ? EMPTY_PLAYER_OVERLAY
    : (overlay.players[playerKey(account)] ?? EMPTY_PLAYER_OVERLAY)

type Schedule = Pick<Game, 'gameStart' | 'originalDeadline' | 'deadline'>

const scheduleOf = (base: Game, overlay: GameOverlay, rules: Rules): Schedule => {
  const extra = overlay.extensions * rules.overtimeExtension
  if (overlay.startedAt !== null && base.gameStart === 0) {
    const originalDeadline = overlay.startedAt + base.config.duration
    return { gameStart: overlay.startedAt, originalDeadline, deadline: originalDeadline + extra }
  }
  return {
    gameStart: base.gameStart,
    originalDeadline: base.originalDeadline,
    deadline: base.deadline + extra,
  }
}

export const overlayGame = (base: Game, overlay: GameOverlay, rules: Rules, now: number): Game => {
  if (overlay === EMPTY_OVERLAY) {
    return base
  }
  const raisedByTeam = addPair(base.raisedByTeam, overlay.raisedByTeam)
  const pullByTeam = addPair(base.pullByTeam, overlay.pullByTeam)
  const pulls = { blue: pullWei(pullByTeam.blue), red: pullWei(pullByTeam.red) }
  const raised = bnbWei(raisedByTeam.blue + raisedByTeam.red)
  const schedule = scheduleOf(base, overlay, rules)
  const started = schedule.gameStart !== 0
  const launched = overlay.launched || base.phase === 'launched'
  const cancelled = overlay.cancelled || base.phase === 'cancelled'
  const phase = cancelled
    ? 'cancelled'
    : started
      ? livePhaseAt(
          now,
          schedule.deadline,
          raised >= base.config.minRaise,
          rules.launchGrace,
          launched,
        )
      : base.phase
  const budget = overlay.autoLaunch?.budget ?? base.triggerBudget
  return {
    ...base,
    ...schedule,
    phase,
    captainDeposited: {
      blue: base.captainDeposited.blue || overlay.captainsIn.blue,
      red: base.captainDeposited.red || overlay.captainsIn.red,
    },
    extensionsUsed: base.extensionsUsed + overlay.extensions,
    currentWeightBps: started
      ? weightBpsAt({ ...schedule, startWeightBps: rules.startWeightBps }, now)
      : base.currentWeightBps,
    raised,
    raisedByTeam: { blue: bnbWei(raisedByTeam.blue), red: bnbWei(raisedByTeam.red) },
    pullByTeam: pulls,
    playersByTeam: {
      blue: base.playersByTeam.blue + overlay.playersByTeam.blue,
      red: base.playersByTeam.red + overlay.playersByTeam.red,
    },
    ropeBps: ropeBpsOf(pulls),
    autoLaunchRequestId: overlay.autoLaunch === null ? base.autoLaunchRequestId : 1n,
    triggerFunder: overlay.autoLaunch?.funder ?? base.triggerFunder,
    triggerBudget: bnbWei(overlay.budgetWithdrawn ? 0n : budget),
    ...(launched && base.phase !== 'launched'
      ? {
          token: FIXTURE_ADDRESSES.token,
          pool: FIXTURE_ADDRESSES.pool,
          vault: FIXTURE_ADDRESSES.vault,
          finalBlueShareBps: finalBlueShareOf(pulls, base.config.maxBonusShareBps),
        }
      : {}),
  }
}

export const overlayPlayer = (
  base: PlayerRead,
  overlay: PlayerOverlay,
  game: Game,
  rules: Rules,
): PlayerRead => {
  if (overlay === EMPTY_PLAYER_OVERLAY) {
    return base
  }
  const team = base.player.team === 'none' ? overlay.team : base.player.team
  const contribution = bnbWei(base.player.contribution + overlay.contribution)
  const pull = pullWei(base.player.pull + overlay.pull)
  const cap = game.config.walletCap
  const shares =
    team === 'none'
      ? { base: tokenWei(0n), bonus: tokenWei(0n) }
      : entitlements(game, rules, team, contribution, pull)
  const total = tokenWei(shares.base + shares.bonus)
  const refundable = !overlay.refunded && game.phase === 'refunding' ? contribution : 0n
  return {
    player: {
      team,
      contribution,
      pull,
      baseEntitlement: shares.base,
      bonusEntitlement: shares.bonus,
      claimed: overlay.claimed ? total : tokenWei(0n),
      claimable: overlay.claimed ? tokenWei(0n) : total,
      refundable: bnbWei(refundable),
      remainingCap: bnbWei(contribution >= cap ? 0n : cap - contribution),
    },
    balance: bnbWei(base.balance > overlay.spent ? base.balance - overlay.spent : 0n),
  }
}
