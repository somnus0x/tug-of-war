import type { Lead } from './derive-live'
import type { RefundReason } from './derive-screen'
import type { AutoLaunchStatus } from './game-events'
import type { Roles } from './roles'
import type { Game, Gates, Player, Rules } from '@/contracts/types'
import type { Phase } from '@/lib/phase'
import type { BnbWei, Bps } from '@/lib/units'

import { secondsLeft } from '@/lib/clock'

import { isZeroAddress, leaderShareOf, leadOf } from './derive-live'
import { graceEndOf, refundReasonOf } from './derive-screen'

export type FloorCause = 'belowFloor' | 'floorUnreadable'

export type EndedPanel =
  | { readonly kind: 'canLaunch'; readonly lead: Lead; readonly leaderShareBps: Bps }
  | { readonly kind: 'autoLaunchScheduled'; readonly lead: Lead; readonly leaderShareBps: Bps }
  | {
      readonly kind: 'floorBlocked'
      readonly cause: FloorCause
      readonly graceEnd: number
      readonly graceLeft: number
    }
  | { readonly kind: 'launched'; readonly raised: BnbWei }
  | {
      readonly kind: 'refundAvailable'
      readonly reason: RefundReason
      readonly refundable: BnbWei
      readonly raised: BnbWei
      readonly minRaise: BnbWei
      readonly launchGrace: number
    }
  | { readonly kind: 'refunded'; readonly amount: BnbWei | null }
  | { readonly kind: 'updating'; readonly reason: RefundReason }
  | {
      readonly kind: 'nothingToRefund'
      readonly reason: RefundReason
      readonly connected: boolean
      readonly raised: BnbWei
      readonly minRaise: BnbWei
    }
  | { readonly kind: 'cancelled' }

export type EndedPanelState = {
  readonly panel: EndedPanel
  readonly withdrawBudget: BnbWei | null
}

export type EndedPanelInput = {
  readonly game: Game
  readonly rules: Rules
  readonly player: Player | null
  readonly gates: Gates
  readonly roles: Roles
  readonly chainNow: number
  readonly refundedAmount: BnbWei | null
  readonly autoLaunchStatus: AutoLaunchStatus
}

const FLOOR_CAUSES: Readonly<Record<string, FloorCause>> = {
  BelowCreationFloor: 'belowFloor',
  CreationFloorUnavailable: 'floorUnreadable',
}

const floorCauseOf = (gates: Gates): FloorCause | null => {
  const gate = gates.launch
  if (gate === null || gate.ok) {
    return null
  }
  return FLOOR_CAUSES[gate.reason] ?? null
}

const awaitingLaunchPanel = ({
  game,
  rules,
  gates,
  chainNow,
  autoLaunchStatus,
}: EndedPanelInput): EndedPanel => {
  const cause = floorCauseOf(gates)
  if (cause !== null) {
    const graceEnd = graceEndOf(game, rules)
    return { kind: 'floorBlocked', cause, graceEnd, graceLeft: secondsLeft(graceEnd, chainNow) }
  }
  const lead = leadOf(game.pullByTeam)
  const leaderShareBps = leaderShareOf(lead, game.ropeBps)
  const isScheduled = !isZeroAddress(game.triggerFunder) && autoLaunchStatus === 'scheduled'
  const kind = isScheduled ? 'autoLaunchScheduled' : 'canLaunch'
  return { kind, lead, leaderShareBps }
}

export const isGraceOver = ({ game, rules, gates, chainNow }: EndedPanelInput): boolean =>
  chainNow >= graceEndOf(game, rules) ||
  (gates.launch !== null && !gates.launch.ok && gates.launch.reason === 'LaunchGraceExpired')

const refundingPanel = ({ game, rules, player, refundedAmount }: EndedPanelInput): EndedPanel => {
  const raised = game.raised
  const minRaise = game.config.minRaise
  const reason = refundReasonOf(game)
  if (player === null) {
    return { kind: 'nothingToRefund', reason, connected: false, raised, minRaise }
  }
  if (player.refundable > 0n) {
    return {
      kind: 'refundAvailable',
      reason,
      refundable: player.refundable,
      raised,
      minRaise,
      launchGrace: rules.launchGrace,
    }
  }
  if (player.contribution > 0n) {
    return { kind: 'updating', reason }
  }
  if (player.team !== 'none' && (refundedAmount !== null || player.pull > 0n)) {
    return { kind: 'refunded', amount: refundedAmount }
  }
  return { kind: 'nothingToRefund', reason, connected: true, raised, minRaise }
}

const PANELS: Record<Phase, (input: EndedPanelInput) => EndedPanel | null> = {
  awaitingCaptains: () => null,
  buyIn: () => null,
  awaitingLaunch: (input) =>
    isGraceOver(input) ? refundingPanel(input) : awaitingLaunchPanel(input),
  refunding: refundingPanel,
  launched: ({ game }) => ({ kind: 'launched', raised: game.raised }),
  cancelled: () => ({ kind: 'cancelled' }),
}

const panelOf = (input: EndedPanelInput): EndedPanel | null => PANELS[input.game.phase](input)

const withdrawBudgetOf = ({ game, roles }: EndedPanelInput): BnbWei | null => {
  const ended = game.phase === 'refunding' || game.phase === 'launched'
  return roles.funder && ended && game.triggerBudget > 0n ? game.triggerBudget : null
}

export const deriveEndedPanel = (input: EndedPanelInput): EndedPanelState | null => {
  const panel = panelOf(input)
  return panel === null ? null : { panel, withdrawBudget: withdrawBudgetOf(input) }
}
