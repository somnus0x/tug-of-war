import type { Lead } from './derive-live'
import type { RefundReason } from './derive-screen'
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
  | { readonly kind: 'refunded'; readonly amount: BnbWei }
  | {
      readonly kind: 'nothingToRefund'
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

const awaitingLaunchPanel = ({ game, rules, gates, chainNow }: EndedPanelInput): EndedPanel => {
  const cause = floorCauseOf(gates)
  if (cause !== null) {
    const graceEnd = graceEndOf(game, rules)
    return { kind: 'floorBlocked', cause, graceEnd, graceLeft: secondsLeft(graceEnd, chainNow) }
  }
  const lead = leadOf(game.pullByTeam)
  const leaderShareBps = leaderShareOf(lead, game.ropeBps)
  const kind = isZeroAddress(game.triggerFunder) ? 'canLaunch' : 'autoLaunchScheduled'
  return { kind, lead, leaderShareBps }
}

const refundingPanel = ({ game, rules, player }: EndedPanelInput): EndedPanel => {
  const raised = game.raised
  const minRaise = game.config.minRaise
  if (player === null) {
    return { kind: 'nothingToRefund', connected: false, raised, minRaise }
  }
  if (player.refundable > 0n) {
    return {
      kind: 'refundAvailable',
      reason: refundReasonOf(game),
      refundable: player.refundable,
      raised,
      minRaise,
      launchGrace: rules.launchGrace,
    }
  }
  if (player.team !== 'none') {
    return { kind: 'refunded', amount: player.contribution }
  }
  return { kind: 'nothingToRefund', connected: true, raised, minRaise }
}

const PANELS: Record<Phase, (input: EndedPanelInput) => EndedPanel | null> = {
  awaitingCaptains: () => null,
  buyIn: () => null,
  awaitingLaunch: awaitingLaunchPanel,
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
