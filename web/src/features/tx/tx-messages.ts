import type { ActionOutcomes } from '@/contracts/tx/outcome'
import type { Game, Player, Rules } from '@/contracts/types'
import type { ErrorValues } from '@/copy/errors'
import type { TxMessage } from '@/copy/tx'
import type { LauncherActionName } from '@/lib/actions'

import { GAME_COPY } from '@/copy/game'
import { TX_COPY } from '@/copy/tx'
import { formatBnb, formatCoins, formatDateTime, formatPull, formatWeight } from '@/lib/format'
import { tokenWei } from '@/lib/units'

const COIN_DECIMALS = 18

export type MessageContext = {
  readonly game: Game | undefined
  readonly player: Player | undefined
  readonly rules: Rules | undefined
}

type Builders = {
  readonly [Name in LauncherActionName]: (
    outcome: ActionOutcomes[Name],
    context: MessageContext,
  ) => TxMessage
}

const symbolOf = (context: MessageContext): string => context.game?.config.symbol ?? ''

const BUILDERS: Builders = {
  contribute: (outcome) =>
    TX_COPY.success.pullLanded({
      amount: formatBnb(outcome.amount),
      weight: formatWeight(outcome.weightBps),
      pull: formatPull(outcome.pull),
      team: GAME_COPY.team[outcome.team],
    }),
  depositCaptain: (outcome) =>
    TX_COPY.success.deposited({
      amount: formatBnb(outcome.amount),
      team: GAME_COPY.team[outcome.team],
      started: outcome.started,
    }),
  cancel: (outcome) =>
    TX_COPY.success.cancelled({
      refunded: outcome.refunded === 0n ? null : formatBnb(outcome.refunded),
    }),
  scheduleAutoLaunch: () => TX_COPY.success.scheduled,
  launch: (outcome, context) =>
    TX_COPY.success.launched({
      name: context.game?.config.name ?? GAME_COPY.heading,
      raised: formatBnb(outcome.raised),
    }),
  refund: (outcome) => TX_COPY.success.refunded({ amount: formatBnb(outcome.amount) }),
  claim: (outcome, context) =>
    TX_COPY.success.coinsClaimed({
      amount: formatCoins(tokenWei(outcome.base + outcome.bonus), COIN_DECIMALS),
      symbol: symbolOf(context),
    }),
  claimCaptain: (outcome, context) =>
    TX_COPY.success.captainCoinsClaimed({
      amount: formatCoins(outcome.amount, COIN_DECIMALS),
      symbol: symbolOf(context),
    }),
  withdrawTriggerBudget: (outcome) =>
    TX_COPY.success.budgetWithdrawn({ amount: formatBnb(outcome.amount) }),
}

export const successMessage = <Name extends LauncherActionName>(
  action: Name,
  outcome: ActionOutcomes[Name] | null,
  context: MessageContext,
): TxMessage => {
  if (outcome === null) {
    return TX_COPY.success.done(action)
  }
  const build: Builders[Name] = BUILDERS[action]
  return build(outcome, context)
}

export const errorValues = (context: MessageContext): ErrorValues => {
  const { game, player, rules } = context
  const values: { -readonly [Key in keyof ErrorValues]: ErrorValues[Key] } = {}
  if (player !== undefined) {
    values.remainingCap = formatBnb(player.remainingCap)
    if (player.team !== 'none') {
      values.team = GAME_COPY.team[player.team]
    }
  }
  if (game !== undefined) {
    values.captainMinDeposit = formatBnb(game.config.captainMinDeposit)
    values.time = formatDateTime(game.acceptDeadline)
    if (rules !== undefined && game.deadline > 0) {
      values.graceEnd = formatDateTime(game.deadline + rules.launchGrace)
    }
  }
  return values
}
