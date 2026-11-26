import type { MutableGates } from '../gate-plan'
import type { ContributePreview, Game, Gate, Gates, Player, Rules, TeamPair } from '../types'
import type { Team } from '@/lib/team'
import type { BnbWei, PullWei } from '@/lib/units'
import type { Address } from 'viem'

import { weightBpsAt } from '@/lib/clock'
import { bnbWei, mulBps, pullWei } from '@/lib/units'

import { EMPTY_GATES, gatePlan } from '../gate-plan'
import { ropeBpsOf } from './builder'
import { ZERO_ADDRESS } from './constants'
import { freshPlayer } from './viewers'

export type SimulatorState = {
  readonly game: Game
  readonly rules: Rules
  readonly now: number
  readonly account: Address | undefined
  readonly player: Player | undefined
  readonly floorBlocked: boolean
  readonly autoLaunchQuote: BnbWei
}

type Leader = 'blue' | 'red' | 'none'

const OK: Gate = { ok: true }

const fail = (reason: string): Gate => ({ ok: false, reason })

const sameAddress = (a: Address | undefined, b: Address): boolean =>
  a !== undefined && a.toLowerCase() === b.toLowerCase()

const captainTeam = (game: Game, account: Address | undefined): Team => {
  if (sameAddress(account, game.config.captainBlue)) {
    return 'blue'
  }
  return sameAddress(account, game.config.captainRed) ? 'red' : 'none'
}

const playerOf = (state: SimulatorState): Player => state.player ?? freshPlayer(state.game)

const bothCaptainsIn = (game: Game): boolean =>
  game.captainDeposited.blue && game.captainDeposited.red

const minMet = (game: Game): boolean => game.raised >= game.config.minRaise

const graceOver = (state: SimulatorState): boolean =>
  state.now >= state.game.deadline + state.rules.launchGrace

export const leaderOf = (pull: TeamPair<PullWei>): Leader => {
  if (pull.blue === pull.red) {
    return 'none'
  }
  return pull.blue > pull.red ? 'blue' : 'red'
}

export const canContribute = (state: SimulatorState, team: Team, amount: BnbWei): Gate => {
  const { game, now } = state
  const player = playerOf(state)
  if (game.phase === 'cancelled') return fail('GameCancelled')
  if (game.phase === 'launched') return fail('AlreadyLaunched')
  if (!bothCaptainsIn(game)) return fail('CaptainsNotIn')
  if (now >= game.deadline) return fail('BuyInClosed')
  if (team === 'none') return fail('InvalidTeam')
  if (player.team !== 'none' && player.team !== team) return fail('TeamLocked')
  if (amount === 0n) return fail('ZeroContribution')
  if (amount > player.remainingCap) return fail('WalletCapExceeded')
  return OK
}

export const previewContribute = (
  state: SimulatorState,
  team: Team,
  amount: BnbWei,
): ContributePreview | null => {
  const { game, rules, now } = state
  if (team === 'none') {
    return null
  }
  const weight = weightBpsAt(
    {
      gameStart: game.gameStart,
      originalDeadline: game.originalDeadline,
      startWeightBps: rules.startWeightBps,
    },
    now,
  )
  const pull = pullWei(mulBps(amount, weight))
  const after: TeamPair<PullWei> = {
    blue: pullWei(game.pullByTeam.blue + (team === 'blue' ? pull : 0n)),
    red: pullWei(game.pullByTeam.red + (team === 'red' ? pull : 0n)),
  }
  const wouldTriggerOvertime =
    game.phase === 'buyIn' &&
    now < game.deadline &&
    leaderOf(game.pullByTeam) !== leaderOf(after) &&
    game.deadline - now <= rules.overtimeWindow &&
    game.extensionsUsed < rules.maxExtensions
  return { pull, newRopeBps: ropeBpsOf(after), wouldTriggerOvertime }
}

export const canDepositCaptain = (state: SimulatorState, amount: BnbWei): Gate => {
  const { game, now, account } = state
  const team = captainTeam(game, account)
  if (game.phase === 'cancelled') return fail('GameCancelled')
  if (team === 'none') return fail('NotCaptain')
  if (game.captainDeposited[team]) return fail('CaptainAlreadyIn')
  if (now >= game.acceptDeadline) return fail('AcceptWindowClosed')
  if (amount < game.config.captainMinDeposit) return fail('BelowCaptainMinimum')
  if (amount > game.config.walletCap) return fail('WalletCapExceeded')
  return OK
}

export const canCancel = (state: SimulatorState): Gate => {
  const { game, now } = state
  if (game.phase === 'cancelled') return fail('GameCancelled')
  if (bothCaptainsIn(game)) return fail('NotCancellable')
  if (now < game.acceptDeadline) return fail('AcceptWindowOpen')
  return OK
}

export const canScheduleAutoLaunch = (state: SimulatorState): Gate => {
  const { game, now } = state
  if (game.phase === 'cancelled') return fail('GameCancelled')
  if (game.phase === 'launched') return fail('AlreadyLaunched')
  if (!bothCaptainsIn(game)) return fail('GameNotStarted')
  if (game.triggerFunder !== ZERO_ADDRESS) return fail('AutoLaunchAlreadyScheduled')
  if (now > game.deadline || game.phase === 'refunding') return fail('BuyInClosed')
  return OK
}

const afterClockGate = (state: SimulatorState): Gate | null => {
  const { game, now } = state
  if (game.phase === 'cancelled') return fail('GameCancelled')
  if (game.phase === 'launched') return fail('AlreadyLaunched')
  if (!bothCaptainsIn(game)) return fail('GameNotStarted')
  if (now < game.deadline) return fail('BuyInOpen')
  return null
}

export const canLaunch = (state: SimulatorState): Gate => {
  const blocked = afterClockGate(state)
  if (blocked !== null) return blocked
  if (!minMet(state.game)) return fail('BelowMinRaise')
  if (graceOver(state)) return fail('LaunchGraceExpired')
  if (state.floorBlocked) return fail('BelowCreationFloor')
  return OK
}

export const canRefund = (state: SimulatorState): Gate => {
  const blocked = afterClockGate(state)
  if (blocked !== null) return blocked
  if (minMet(state.game) && !graceOver(state)) return fail('MinRaiseMet')
  if (playerOf(state).refundable === 0n) return fail('NothingToRefund')
  return OK
}

export const canClaim = (state: SimulatorState): Gate => {
  if (state.game.phase !== 'launched') return fail('NotLaunched')
  if (playerOf(state).claimable === 0n) return fail('NothingToClaim')
  return OK
}

export const canClaimCaptain = (state: SimulatorState): Gate => {
  if (captainTeam(state.game, state.account) === 'none') return fail('NotCaptain')
  if (state.game.phase !== 'launched') return fail('NotLaunched')
  return OK
}

export const simulateGates = (
  state: SimulatorState,
  draft: { readonly team: Team; readonly amount: BnbWei } | null,
): Gates => {
  const plan = gatePlan({
    launcher: state.game.launcher,
    account: state.account,
    phase: state.game.phase,
    draft,
  })
  const team = draft?.team ?? 'none'
  const amount = draft?.amount ?? bnbWei(0n)
  const run = {
    contribute: () => canContribute(state, team, amount),
    depositCaptain: () => canDepositCaptain(state, amount),
    cancel: () => canCancel(state),
    scheduleAutoLaunch: () => canScheduleAutoLaunch(state),
    launch: () => canLaunch(state),
    refund: () => canRefund(state),
    claim: () => canClaim(state),
    claimCaptain: () => canClaimCaptain(state),
  }
  const gates: MutableGates = { ...EMPTY_GATES }
  for (const name of plan.gates) {
    gates[name] = run[name]()
  }
  return {
    ...gates,
    preview: plan.preview ? previewContribute(state, team, amount) : null,
    autoLaunchQuote: plan.autoLaunchQuote ? state.autoLaunchQuote : null,
  }
}
