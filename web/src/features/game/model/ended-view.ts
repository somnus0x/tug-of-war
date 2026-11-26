import type { EndedPanel } from './ended-panel'
import type { Game, Rules } from '@/contracts/types'
import type { BnbWei } from '@/lib/units'

import { ENDED_COPY } from '@/copy/ended'
import { GAME_COPY } from '@/copy/game'
import { formatBnb, formatCoins, formatDateTime, formatShare, formatSpan } from '@/lib/format'
import { TOKEN_DECIMALS, TOTAL_SUPPLY } from '@/lib/launch'
import { BPS_DENOMINATOR, bps, mulBps, tokenWei } from '@/lib/units'

export type EndedAction =
  | { readonly kind: 'launch' }
  | { readonly kind: 'refund'; readonly amount: BnbWei }
  | { readonly kind: 'connect' }
  | { readonly kind: 'vault' }

export type EndedView = {
  readonly title: string
  readonly body: string
  readonly action: EndedAction | null
}

const leaderLine = (lead: 'blue' | 'red' | 'tie', share: string): string =>
  lead === 'tie' ? GAME_COPY.level(share) : GAME_COPY.holds(GAME_COPY.team[lead], share)

export const poolCoinsOf = (rules: Rules): string =>
  formatCoins(tokenWei(mulBps(TOTAL_SUPPLY, rules.poolAllocBps)), TOKEN_DECIMALS)

const refundTitle = (reason: 'minMissed' | 'graceExpired'): string =>
  reason === 'minMissed' ? ENDED_COPY.minMissed : ENDED_COPY.graceExpired

export const endedViewOf = (
  panel: EndedPanel,
  game: Game,
  rules: Rules,
  isLaunching: boolean,
): EndedView | null => {
  switch (panel.kind) {
    case 'canLaunch':
    case 'autoLaunchScheduled': {
      if (isLaunching) {
        return {
          title: ENDED_COPY.launching,
          body: ENDED_COPY.seeding(formatBnb(game.raised)),
          action: { kind: 'launch' },
        }
      }
      const body =
        panel.kind === 'canLaunch'
          ? ENDED_COPY.leaderCanLaunch(leaderLine(panel.lead, formatShare(panel.leaderShareBps)))
          : ENDED_COPY.autoLaunchOnWay
      return { title: ENDED_COPY.timeUp, body, action: { kind: 'launch' } }
    }
    case 'floorBlocked':
      return {
        title: ENDED_COPY.onHold,
        body:
          panel.cause === 'belowFloor'
            ? ENDED_COPY.belowFloor(formatDateTime(panel.graceEnd))
            : ENDED_COPY.floorUnreadable,
        action: null,
      }
    case 'launched':
      return {
        title: ENDED_COPY.live(game.config.name),
        body: ENDED_COPY.pool(formatBnb(panel.raised), poolCoinsOf(rules), game.config.symbol),
        action: { kind: 'vault' },
      }
    case 'refundAvailable':
      return {
        title: refundTitle(panel.reason),
        body:
          panel.reason === 'minMissed'
            ? ENDED_COPY.minMissedBody(formatBnb(panel.raised), formatBnb(panel.minRaise))
            : ENDED_COPY.graceExpiredBody(formatSpan(panel.launchGrace)),
        action: { kind: 'refund', amount: panel.refundable },
      }
    case 'refunded':
      return {
        title: ENDED_COPY.refunded,
        body:
          panel.amount === null
            ? ENDED_COPY.refundedPlain
            : ENDED_COPY.refundedBody(formatBnb(panel.amount)),
        action: null,
      }
    case 'updating':
      return { title: refundTitle(panel.reason), body: ENDED_COPY.updating, action: null }
    case 'nothingToRefund': {
      if (!panel.connected) {
        return {
          title: refundTitle(panel.reason),
          body: ENDED_COPY.connectToRefund,
          action: { kind: 'connect' },
        }
      }
      return {
        title: refundTitle(panel.reason),
        body:
          panel.reason === 'minMissed'
            ? ENDED_COPY.nothingToRefund(formatBnb(panel.raised), formatBnb(panel.minRaise))
            : ENDED_COPY.nothingToRefundLate,
        action: null,
      }
    }
    default:
      return null
  }
}

export const splitLineOf = (game: Game): string | null => {
  if (game.phase !== 'launched') {
    return null
  }
  const blue = bps(game.finalBlueShareBps)
  return ENDED_COPY.split(formatShare(blue), formatShare(bps(BPS_DENOMINATOR - blue)))
}
