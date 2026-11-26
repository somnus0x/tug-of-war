import type { ActionParams, PickedTeam } from '../tx/actions'
import type { ActionOutcomes } from '../tx/outcome'
import type { Game, Player, TeamPair } from '../types'
import type { GameOverlay, PlayerOverlay } from './overlay'
import type { SimulatorState } from './simulator'
import type { LauncherActionName } from '@/lib/actions'
import type { BnbWei } from '@/lib/units'
import type { Address } from 'viem'

import { weightBpsAt } from '@/lib/clock'
import { bnbWei, bps, mulBps, pullWei, tokenWei } from '@/lib/units'

import { finalBlueShareOf, ropeBpsOf } from './builder'
import { FIXTURE_ADDRESSES, TOTAL_SUPPLY } from './constants'
import { playerKey, playerOverlayOf } from './overlay'
import { previewContribute } from './simulator'

export type EffectInput<Name extends LauncherActionName> = {
  readonly action: Name
  readonly params: ActionParams[Name]
  readonly state: SimulatorState
  readonly player: Player
  readonly overlay: GameOverlay
}

export type EffectResult<Name extends LauncherActionName> = {
  readonly overlay: GameOverlay
  readonly outcome: ActionOutcomes[Name]
}

const CAPTAIN_VEST_DAYS = 30n

const bump = (pair: TeamPair<bigint>, team: PickedTeam, by: bigint): TeamPair<bigint> =>
  team === 'blue'
    ? { blue: pair.blue + by, red: pair.red }
    : { blue: pair.blue, red: pair.red + by }

const count = (pair: TeamPair<number>, team: PickedTeam): TeamPair<number> =>
  team === 'blue' ? { blue: pair.blue + 1, red: pair.red } : { blue: pair.blue, red: pair.red + 1 }

const withPlayer = (
  overlay: GameOverlay,
  account: Address | undefined,
  change: (current: PlayerOverlay) => PlayerOverlay,
): GameOverlay =>
  account === undefined
    ? overlay
    : {
        ...overlay,
        players: {
          ...overlay.players,
          [playerKey(account)]: change(playerOverlayOf(overlay, account)),
        },
      }

const captainTeamOf = (game: Game, account: Address | undefined): PickedTeam => {
  const lower = account?.toLowerCase()
  return lower === game.config.captainRed.toLowerCase() ? 'red' : 'blue'
}

const contribute = (input: EffectInput<'contribute'>): EffectResult<'contribute'> => {
  const { state, params, player } = input
  const { game, rules, now } = state
  const weight = weightBpsAt(
    {
      gameStart: game.gameStart,
      originalDeadline: game.originalDeadline,
      startWeightBps: rules.startWeightBps,
    },
    now,
  )
  const pull = pullWei(mulBps(params.amount, weight))
  const extended =
    previewContribute(state, params.team, params.amount)?.wouldTriggerOvertime === true
  const firstPull = player.team === 'none'
  const after = bump(game.pullByTeam, params.team, pull)
  const base = input.overlay
  const overlay = withPlayer(
    {
      ...base,
      raisedByTeam: bump(base.raisedByTeam, params.team, params.amount),
      pullByTeam: bump(base.pullByTeam, params.team, pull),
      playersByTeam: firstPull ? count(base.playersByTeam, params.team) : base.playersByTeam,
      extensions: base.extensions + (extended ? 1 : 0),
      pulls: [
        ...base.pulls,
        {
          account: state.account ?? FIXTURE_ADDRESSES.funder,
          team: params.team,
          amount: params.amount,
          pull,
          weightBps: weight,
          captain: false,
          at: now,
          extensionsUsed: extended ? game.extensionsUsed + 1 : null,
        },
      ],
    },
    state.account,
    (current) => ({
      ...current,
      team: params.team,
      contribution: current.contribution + params.amount,
      pull: current.pull + pull,
      spent: current.spent + params.amount,
    }),
  )
  return {
    overlay,
    outcome: {
      team: params.team,
      amount: params.amount,
      pull,
      weightBps: weight,
      ropeBps: ropeBpsOf({ blue: pullWei(after.blue), red: pullWei(after.red) }),
    },
  }
}

const depositCaptain = (input: EffectInput<'depositCaptain'>): EffectResult<'depositCaptain'> => {
  const { state, params } = input
  const { game, rules, now } = state
  const team = captainTeamOf(game, state.account)
  const base = input.overlay
  const captainsIn = { ...base.captainsIn, [team]: true }
  const started =
    (game.captainDeposited.blue || captainsIn.blue) && (game.captainDeposited.red || captainsIn.red)
  const pull = mulBps(params.amount, rules.startWeightBps)
  const overlay = withPlayer(
    {
      ...base,
      captainsIn,
      raisedByTeam: bump(base.raisedByTeam, team, params.amount),
      pullByTeam: bump(base.pullByTeam, team, pull),
      playersByTeam: count(base.playersByTeam, team),
      startedAt: started ? now : base.startedAt,
      pulls: [
        ...base.pulls,
        {
          account: state.account ?? FIXTURE_ADDRESSES.funder,
          team,
          amount: params.amount,
          pull,
          weightBps: rules.startWeightBps,
          captain: true,
          at: now,
          extensionsUsed: null,
        },
      ],
    },
    state.account,
    (current) => ({
      ...current,
      team,
      contribution: current.contribution + params.amount,
      pull: current.pull + pull,
      spent: current.spent + params.amount,
    }),
  )
  return { overlay, outcome: { team, amount: params.amount, started } }
}

const depositedByCaptains = (game: Game): BnbWei =>
  bnbWei(
    (game.captainDeposited.blue ? game.raisedByTeam.blue : 0n) +
      (game.captainDeposited.red ? game.raisedByTeam.red : 0n),
  )

const returnCaptainDeposits = (overlay: GameOverlay, game: Game): GameOverlay =>
  [game.config.captainBlue, game.config.captainRed].reduce(
    (current, captain) =>
      playerOverlayOf(current, captain).contribution === 0n
        ? current
        : withPlayer(current, captain, (player) => ({
            ...player,
            contribution: 0n,
            spent: player.spent - player.contribution,
          })),
    overlay,
  )

type Effects = {
  readonly [Name in LauncherActionName]: (input: EffectInput<Name>) => EffectResult<Name>
}

const EFFECTS: Effects = {
  contribute,
  depositCaptain,
  cancel: (input) => ({
    overlay: returnCaptainDeposits({ ...input.overlay, cancelled: true }, input.state.game),
    outcome: { refunded: depositedByCaptains(input.state.game) },
  }),
  scheduleAutoLaunch: (input) => ({
    overlay: {
      ...input.overlay,
      autoLaunch: {
        funder: input.state.account ?? FIXTURE_ADDRESSES.funder,
        budget: input.state.autoLaunchQuote,
      },
    },
    outcome: { requestId: 1n },
  }),
  launch: (input) => {
    const { game } = input.state
    return {
      overlay: { ...input.overlay, launched: true },
      outcome: {
        raised: game.raised,
        token: FIXTURE_ADDRESSES.token,
        finalBlueShareBps: bps(finalBlueShareOf(game.pullByTeam, game.config.maxBonusShareBps)),
      },
    }
  },
  refund: (input) => ({
    overlay: withPlayer(input.overlay, input.state.account, (current) => ({
      ...current,
      refunded: true,
      spent: current.spent - input.player.refundable,
    })),
    outcome: { amount: input.player.refundable },
  }),
  claim: (input) => ({
    overlay: withPlayer(input.overlay, input.state.account, (current) => ({
      ...current,
      claimed: true,
    })),
    outcome: { base: input.player.baseEntitlement, bonus: input.player.bonusEntitlement },
  }),
  claimCaptain: (input) => ({
    overlay: input.overlay,
    outcome: {
      amount: tokenWei(
        mulBps(TOTAL_SUPPLY, input.state.rules.captainAllocBps) / 2n / CAPTAIN_VEST_DAYS,
      ),
    },
  }),
  withdrawTriggerBudget: (input) => ({
    overlay: { ...input.overlay, budgetWithdrawn: true },
    outcome: { amount: input.state.game.triggerBudget },
  }),
}

export const applyEffect = <Name extends LauncherActionName>(
  input: EffectInput<Name>,
): EffectResult<Name> => {
  const effect: Effects[Name] = EFFECTS[input.action]
  return effect(input)
}
