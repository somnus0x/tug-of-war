import type { LiveState } from './derive-live'
import type { Game, Rules, TeamPair } from '@/contracts/types'
import type { Phase } from '@/lib/phase'

import { secondsLeft } from '@/lib/clock'

import { deriveLive } from './derive-live'

export type RefundReason = 'minMissed' | 'graceExpired'

export type Screen =
  | {
      readonly kind: 'waiting'
      readonly acceptOpen: boolean
      readonly captainsIn: TeamPair<boolean>
      readonly acceptLeft: number
    }
  | { readonly kind: 'live'; readonly live: LiveState }
  | { readonly kind: 'awaitingLaunch'; readonly graceEnd: number; readonly graceLeft: number }
  | { readonly kind: 'refunding'; readonly reason: RefundReason; readonly graceEnd: number }
  | { readonly kind: 'launched' }
  | { readonly kind: 'cancelled' }

export const graceEndOf = (game: Game, rules: Rules): number => game.deadline + rules.launchGrace

export const refundReasonOf = (game: Game): RefundReason =>
  game.raised < game.config.minRaise ? 'minMissed' : 'graceExpired'

const SCREENS: Record<Phase, (game: Game, rules: Rules, chainNow: number) => Screen> = {
  awaitingCaptains: (game, _rules, chainNow) => {
    const acceptLeft = secondsLeft(game.acceptDeadline, chainNow)
    return {
      kind: 'waiting',
      acceptOpen: acceptLeft > 0,
      captainsIn: game.captainDeposited,
      acceptLeft,
    }
  },
  buyIn: (game, rules, chainNow) => ({ kind: 'live', live: deriveLive(game, rules, chainNow) }),
  awaitingLaunch: (game, rules, chainNow) => {
    const graceEnd = graceEndOf(game, rules)
    return { kind: 'awaitingLaunch', graceEnd, graceLeft: secondsLeft(graceEnd, chainNow) }
  },
  refunding: (game, rules) => ({
    kind: 'refunding',
    reason: refundReasonOf(game),
    graceEnd: graceEndOf(game, rules),
  }),
  launched: () => ({ kind: 'launched' }),
  cancelled: () => ({ kind: 'cancelled' }),
}

export const deriveScreen = (game: Game, rules: Rules, chainNow: number): Screen =>
  SCREENS[game.phase](game, rules, chainNow)
